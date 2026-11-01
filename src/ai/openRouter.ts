import { parseRetryAfter } from '../api/openTriviaDb';
import { QuestionLoadError } from '../data/questionErrors';
import type { Question } from '../types';
import { AI_RATE_LIMIT_WAIT_MS, AI_TIMEOUT_MS, OPENROUTER_MODEL, OPENROUTER_URL } from './config';
import { getOpenRouterKey } from './openRouterKey';
import { parseAiQuestions } from './parseAiQuestions';
import { buildMessages, normalizeTopic } from './prompt';

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<Response>;

export interface GenerateOptions {
  fetchImpl?: FetchLike;
  apiKey?: string | null;
  model?: string;
  timeoutMs?: number;
  random?: () => number;
}

function cancelledError(): Error {
  const error = new Error('The request was cancelled.');
  error.name = 'AbortError';
  return error;
}

/** Reads the text the model wrote. Some models send a list of parts instead of one string. */
function readReplyText(body: unknown): string {
  const message = (body as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message;
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : ''))
      .join('');
  }
  return '';
}

/** OpenRouter sometimes answers 200 OK but puts an error object in the body. */
function readBodyError(body: unknown): { code: number | null; message: string } | null {
  const error = (body as { error?: { code?: unknown; message?: unknown } })?.error;
  if (!error) return null;
  return {
    code: typeof error.code === 'number' ? error.code : null,
    message: typeof error.message === 'string' ? error.message : 'Unknown error',
  };
}

function errorForStatus(status: number, detail: string, retryAfter: string | null): QuestionLoadError {
  if (status === 429) {
    const wait = Math.min(60_000, Math.max(AI_RATE_LIMIT_WAIT_MS, parseRetryAfter(retryAfter) ?? 0));
    return new QuestionLoadError('rate-limit', `OpenRouter rate limit: ${detail}`, wait, status);
  }
  return new QuestionLoadError('http', `OpenRouter error ${status}: ${detail}`, 0, status);
}

/**
 * Asks the AI for five questions about `topic` and returns them ready to play.
 * One request per call, never retried automatically. Throws QuestionLoadError on any problem.
 */
export async function generateAiQuestions(
  rawTopic: string,
  signal?: AbortSignal,
  options: GenerateOptions = {},
): Promise<Question[]> {
  const topic = normalizeTopic(rawTopic);
  if (!topic) throw new QuestionLoadError('config', 'No topic was entered.');

  const apiKey = options.apiKey !== undefined ? options.apiKey : getOpenRouterKey();
  const model = options.model ?? OPENROUTER_MODEL;
  if (!model) throw new QuestionLoadError('config', 'missing-model');
  if (!apiKey) throw new QuestionLoadError('config', 'missing-key');

  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;

  if (signal?.aborted) throw cancelledError();
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetchImpl(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Trivia on Your Phone',
        },
        body: JSON.stringify({
          model,
          messages: buildMessages(topic),
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } catch {
      if (signal?.aborted) throw cancelledError();
      if (timedOut) throw new QuestionLoadError('timeout', `No reply within ${timeoutMs / 1000} seconds.`);
      throw new QuestionLoadError('network', 'The network request failed.');
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      if (signal?.aborted) throw cancelledError();
      if (timedOut) throw new QuestionLoadError('timeout', `No reply within ${timeoutMs / 1000} seconds.`);
    }

    const retryAfter = response.headers?.get?.('retry-after') ?? null;
    const bodyError = readBodyError(body);
    if (!response.ok) throw errorForStatus(response.status, bodyError?.message ?? 'request failed', retryAfter);
    if (bodyError) throw errorForStatus(bodyError.code ?? 502, bodyError.message, retryAfter);
    if (body === null || typeof body !== 'object') {
      throw new QuestionLoadError('malformed', 'OpenRouter sent a reply that is not JSON.', 0, response.status);
    }

    return parseAiQuestions(readReplyText(body), options.random);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
