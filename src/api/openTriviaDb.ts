import { QuestionLoadError } from '../data/questionErrors';

/**
 * Talks to Open Trivia Database (https://opentdb.com/api_config.php).
 * This file only fetches raw data. Turning it into playable questions happens in convertQuestions.ts.
 *
 * Rules from the official docs that this follows:
 * - Response codes: 0 success, 1 no results, 2 invalid parameter,
 *   3 token not found, 4 token empty (all questions used), 5 rate limit.
 * - Each IP may call the questions API only once every 5 seconds.
 * - Session tokens remember which questions were already sent, and expire after 6 hours of inactivity.
 */
export const QUESTIONS_URL = 'https://opentdb.com/api.php?amount=5&category=9&type=multiple';
export const TOKEN_URL = 'https://opentdb.com/api_token.php';

const REQUEST_TIMEOUT_MS = 10_000;
/** 5 seconds from the docs, plus a small safety margin. */
export const MIN_GAP_BETWEEN_REQUESTS_MS = 5_500;

type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<Response>;

export interface OpenTriviaClientOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  minGapMs?: number;
  now?: () => number;
}

function cancelledError(): Error {
  const error = new Error('The request was cancelled.');
  error.name = 'AbortError';
  return error;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(cancelledError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function readResponseCode(body: unknown): number | undefined {
  if (body && typeof body === 'object' && 'response_code' in body) {
    const code = (body as { response_code: unknown }).response_code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

function rateLimitError(): QuestionLoadError {
  return new QuestionLoadError('rate-limit', 'Open Trivia Database rate limit reached (code 5).', MIN_GAP_BETWEEN_REQUESTS_MS);
}

/** One HTTP request with a timeout. Turns every kind of failure into a QuestionLoadError. */
async function fetchJson(url: string, fetchImpl: FetchLike, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
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
      response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    } catch {
      if (signal?.aborted) throw cancelledError();
      if (timedOut) throw new QuestionLoadError('timeout', `No response within ${timeoutMs / 1000} seconds.`);
      throw new QuestionLoadError('network', 'The network request failed.');
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      if (signal?.aborted) throw cancelledError();
      if (timedOut) throw new QuestionLoadError('timeout', `No response within ${timeoutMs / 1000} seconds.`);
      body = null;
    }

    // Open Trivia Database answers rate limits with HTTP 429 and response_code 5.
    if (response.status === 429 || readResponseCode(body) === 5) throw rateLimitError();
    if (!response.ok) throw new QuestionLoadError('http', `The server answered with HTTP ${response.status}.`);
    if (body === null || typeof body !== 'object') throw new QuestionLoadError('malformed', 'The response was not valid JSON.');
    return body;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Creates a client that remembers one session token and spaces out requests.
 * Tests create their own client with a fake `fetchImpl`.
 */
export function createOpenTriviaClient(options: OpenTriviaClientOptions = {}) {
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => fetch(url, init));
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const minGapMs = options.minGapMs ?? MIN_GAP_BETWEEN_REQUESTS_MS;
  const now = options.now ?? Date.now;

  /** Kept in memory only, so it lasts until the app is fully closed. */
  let sessionToken: string | null = null;
  let lastQuestionsRequestAt = Number.NEGATIVE_INFINITY;

  /** Asks for a token. If that fails, the game still works without one. */
  async function tryGetToken(signal?: AbortSignal, resetToken?: string): Promise<string | null> {
    const url = resetToken
      ? `${TOKEN_URL}?command=reset&token=${encodeURIComponent(resetToken)}`
      : `${TOKEN_URL}?command=request`;
    try {
      const body = (await fetchJson(url, fetchImpl, timeoutMs, signal)) as { response_code?: unknown; token?: unknown };
      if (body.response_code === 0 && typeof body.token === 'string' && body.token !== '') return body.token;
      // A successful reset may not repeat the token; the old one is valid again.
      if (body.response_code === 0 && resetToken) return resetToken;
      return null;
    } catch (error) {
      if (signal?.aborted) throw cancelledError();
      return null;
    }
  }

  /** Requests one set of questions, waiting first if the last request was under 5 seconds ago. */
  async function requestQuestions(signal?: AbortSignal): Promise<unknown> {
    const wait = lastQuestionsRequestAt + minGapMs - now();
    if (wait > 0) await sleep(wait, signal);
    lastQuestionsRequestAt = now();
    const url = sessionToken ? `${QUESTIONS_URL}&token=${encodeURIComponent(sessionToken)}` : QUESTIONS_URL;
    return fetchJson(url, fetchImpl, timeoutMs, signal);
  }

  /** Returns the raw `results` array for one new game. */
  async function fetchQuestions(signal?: AbortSignal): Promise<unknown[]> {
    if (!sessionToken) sessionToken = await tryGetToken(signal);

    let body = await requestQuestions(signal);
    let code = readResponseCode(body);

    // Token problems get exactly one fix-and-retry, never a loop.
    if (code === 3 || code === 4) {
      sessionToken = code === 4 && sessionToken ? await tryGetToken(signal, sessionToken) : await tryGetToken(signal);
      body = await requestQuestions(signal);
      code = readResponseCode(body);
    }

    switch (code) {
      case 0: {
        const results = (body as { results?: unknown }).results;
        if (!Array.isArray(results)) throw new QuestionLoadError('malformed', 'The response had no results list.');
        return results;
      }
      case 1:
        throw new QuestionLoadError('no-results', 'Open Trivia Database did not have enough questions (code 1).');
      case 2:
        throw new QuestionLoadError('malformed', 'Open Trivia Database rejected the request parameters (code 2).');
      case 3:
      case 4:
        sessionToken = null; // Start a fresh session on the next attempt.
        throw new QuestionLoadError('token', `The session token could not be used (code ${code}).`);
      case 5:
        throw rateLimitError();
      default:
        throw new QuestionLoadError('malformed', 'The response had an unknown response code.');
    }
  }

  return { fetchQuestions };
}

/** The client the app uses. */
export const openTriviaClient = createOpenTriviaClient();
