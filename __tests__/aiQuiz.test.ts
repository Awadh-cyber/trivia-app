import { OPENROUTER_URL } from '../src/ai/config';
import { describeAiError } from '../src/ai/describeAiError';
import { generateAiQuestions } from '../src/ai/openRouter';
import { extractJson, parseAiQuestions } from '../src/ai/parseAiQuestions';
import { buildMessages, buildUserInstructions, normalizeTopic, SYSTEM_INSTRUCTIONS } from '../src/ai/prompt';
import { QuestionLoadError } from '../src/data/questionErrors';
import { getScore, initialQuizState, quizReducer, type QuizAction, type QuizState } from '../src/logic/quizReducer';

/** Five good questions in the exact shape the AI is asked for. */
function aiQuestions(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Space question ${i + 1}?`,
    correct_answer: `Right ${i + 1}`,
    incorrect_answers: [`Wrong A${i + 1}`, `Wrong B${i + 1}`, `Wrong C${i + 1}`],
  }));
}
const goodReply = JSON.stringify({ questions: aiQuestions() });

async function kindOf(run: () => unknown): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    return error instanceof QuestionLoadError ? error.kind : (error as Error).name;
  }
}

describe('AI prompt', () => {
  it('asks for exactly 5 JSON questions with 1 correct and 3 incorrect answers, and no invented facts', () => {
    const text = buildUserInstructions('Space');
    expect(text).toContain('exactly 5 multiple-choice trivia questions about this topic: "Space"');
    expect(text).toContain('exactly 1 correct answer and exactly 3 incorrect answers');
    expect(text).toContain('Do not invent facts');
    expect(text).toContain('{"questions": []}');
    expect(text).toContain('"correct_answer"');
    expect(text).toContain('"incorrect_answers"');
    expect(SYSTEM_INSTRUCTIONS).toContain('JSON only');
    expect(SYSTEM_INSTRUCTIONS).toContain('no Markdown');
    expect(buildMessages('Space').map((m) => m.role)).toEqual(['system', 'user']);
  });

  it('quotes the topic safely and cleans it up', () => {
    expect(buildUserInstructions('say "hi"\nnow')).toContain('"say \\"hi\\"\\nnow"');
    expect(normalizeTopic('   ancient    Egypt  ')).toBe('ancient Egypt');
    expect(normalizeTopic('   ')).toBe('');
    expect(normalizeTopic('x'.repeat(200))).toHaveLength(60);
  });
});

describe('extractJson', () => {
  it('reads plain JSON, ```json fences, and JSON with extra words around it', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go!\n{"a":1}\nEnjoy.')).toEqual({ a: 1 });
    expect(extractJson('[1,2]')).toEqual([1, 2]);
  });

  it('returns undefined for text that is not JSON, and never runs it', () => {
    (globalThis as Record<string, unknown>).__hacked = false;
    expect(extractJson('globalThis.__hacked = true')).toBeUndefined();
    expect(extractJson('{ not json }')).toBeUndefined();
    expect((globalThis as Record<string, unknown>).__hacked).toBe(false);
  });
});

describe('parseAiQuestions', () => {
  it('turns a good reply into 5 playable questions with the right answer matched', () => {
    const questions = parseAiQuestions(goodReply);
    expect(questions).toHaveLength(5);
    questions.forEach((q, i) => {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.correctIndex]).toBe(`Right ${i + 1}`);
    });
  });

  it('shuffles once: the correct answer lands in every position across many games', () => {
    const positions = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const [q] = parseAiQuestions(goodReply);
      expect(q.choices[q.correctIndex]).toBe('Right 1');
      positions.add(q.correctIndex);
    }
    expect(positions.size).toBe(4);
  });

  it('accepts JSON wrapped in Markdown or extra text, and a bare list', () => {
    expect(parseAiQuestions('```json\n' + goodReply + '\n```')).toHaveLength(5);
    expect(parseAiQuestions('Sure! Here are your questions:\n' + goodReply)).toHaveLength(5);
    expect(parseAiQuestions(JSON.stringify(aiQuestions()))).toHaveLength(5);
  });

  it('rejects empty, unreadable or wrongly shaped replies with a clear error kind', async () => {
    expect(await kindOf(() => parseAiQuestions(''))).toBe('empty');
    expect(await kindOf(() => parseAiQuestions('   '))).toBe('empty');
    expect(await kindOf(() => parseAiQuestions('I cannot help with that.'))).toBe('malformed');
    expect(await kindOf(() => parseAiQuestions('{"items": []}'))).toBe('malformed');
    expect(await kindOf(() => parseAiQuestions('{"questions": []}'))).toBe('no-results');
  });

  it('requires exactly 5 questions', async () => {
    expect(await kindOf(() => parseAiQuestions(JSON.stringify({ questions: aiQuestions(4) })))).toBe('invalid');
    expect(await kindOf(() => parseAiQuestions(JSON.stringify({ questions: aiQuestions(6) })))).toBe('invalid');
  });

  it('requires 1 correct + 3 different incorrect answers, real text, and no repeats', async () => {
    const broken = (change: (q: ReturnType<typeof aiQuestions>) => void) => {
      const qs = aiQuestions();
      change(qs);
      return () => parseAiQuestions(JSON.stringify({ questions: qs }));
    };
    expect(await kindOf(broken((qs) => (qs[0].incorrect_answers = ['a', 'b'])))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[0].incorrect_answers = ['a', 'b', 'c', 'd'])))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[1].incorrect_answers[0] = 'Right 2')))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[1].incorrect_answers[0] = 'right 2 ')))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[2].correct_answer = '')))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[2].question = '  ')))).toBe('invalid');
    expect(await kindOf(broken((qs) => ((qs[3] as Record<string, unknown>).correct_answer = 42)))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[4].question = qs[0].question)))).toBe('invalid');
    expect(await kindOf(broken((qs) => (qs[4].question = 'x'.repeat(400))))).toBe('invalid');
  });
});

type Reply = { status?: number; body?: unknown; badJson?: boolean; throws?: boolean; hang?: boolean; retryAfter?: string };

function fakeFetch(reply: Reply) {
  const calls: { url: string; init: { headers: Record<string, string>; body: string } }[] = [];
  const fetchImpl = jest.fn((url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => {
    calls.push({ url, init });
    if (reply.throws) return Promise.reject(new TypeError('Network request failed'));
    if (reply.hang) {
      return new Promise<Response>((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    }
    const status = reply.status ?? 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? reply.retryAfter ?? null : null) },
      json: () => (reply.badJson ? Promise.reject(new SyntaxError('bad')) : Promise.resolve(reply.body)),
    } as Response);
  });
  return { fetchImpl, calls };
}

const chat = (content: unknown) => ({ choices: [{ message: { role: 'assistant', content } }] });
const OPTS = { apiKey: 'test-key-not-real', model: 'test/model:free' };

describe('generateAiQuestions (OpenRouter)', () => {
  it('sends one request with the model, the instructions and the key, and returns 5 questions', async () => {
    const { fetchImpl, calls } = fakeFetch({ body: chat(goodReply) });
    const questions = await generateAiQuestions('  Space  ', undefined, { ...OPTS, fetchImpl });
    expect(questions).toHaveLength(5);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(OPENROUTER_URL);
    expect(calls[0].init.headers.Authorization).toBe('Bearer test-key-not-real');
    const body = JSON.parse(calls[0].init.body);
    expect(body.model).toBe('test/model:free');
    expect(body.messages[1].content).toContain('about this topic: "Space"');
  });

  it('reads replies sent as a list of text parts', async () => {
    const { fetchImpl } = fakeFetch({ body: chat([{ type: 'text', text: goodReply }]) });
    await expect(generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl })).resolves.toHaveLength(5);
  });

  it('refuses to send anything without a topic, key or model', async () => {
    const { fetchImpl, calls } = fakeFetch({ body: chat(goodReply) });
    expect(await kindOf(() => generateAiQuestions('   ', undefined, { ...OPTS, fetchImpl }))).toBe('config');
    expect(await kindOf(() => generateAiQuestions('Space', undefined, { ...OPTS, apiKey: null, fetchImpl }))).toBe('config');
    expect(await kindOf(() => generateAiQuestions('Space', undefined, { ...OPTS, model: '', fetchImpl }))).toBe('config');
    expect(calls).toHaveLength(0);
  });

  it('keeps the HTTP status code for failed requests', async () => {
    for (const status of [400, 401, 402, 404, 500, 503]) {
      const { fetchImpl } = fakeFetch({ status, body: { error: { code: status, message: 'nope' } } });
      try {
        await generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl });
        throw new Error('should have failed');
      } catch (error) {
        expect(error).toBeInstanceOf(QuestionLoadError);
        expect((error as QuestionLoadError).kind).toBe('http');
        expect((error as QuestionLoadError).status).toBe(status);
      }
    }
  });

  it('treats 429 as a rate limit with a wait (Retry-After respected), and sends only one request', async () => {
    const { fetchImpl, calls } = fakeFetch({ status: 429, body: { error: { code: 429, message: 'slow down' } }, retryAfter: '20' });
    await expect(generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl })).rejects.toMatchObject({
      kind: 'rate-limit',
      status: 429,
      retryAfterMs: 20_000,
    });
    expect(calls).toHaveLength(1);

    const { fetchImpl: f2 } = fakeFetch({ status: 429, body: {} });
    await expect(generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl: f2 })).rejects.toMatchObject({ retryAfterMs: 10_000 });
  });

  it('handles an error hidden inside a 200 reply', async () => {
    const { fetchImpl } = fakeFetch({ body: { error: { code: 502, message: 'provider down' } } });
    await expect(generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl })).rejects.toMatchObject({ kind: 'http', status: 502 });
  });

  it('handles empty replies, broken JSON, no internet and timeouts', async () => {
    const run = (reply: Reply, extra = {}) => kindOf(() => generateAiQuestions('Space', undefined, { ...OPTS, fetchImpl: fakeFetch(reply).fetchImpl, ...extra }));
    expect(await run({ body: chat('') })).toBe('empty');
    expect(await run({ body: chat(null) })).toBe('empty');
    expect(await run({ body: {} })).toBe('empty');
    expect(await run({ body: chat('Sorry, I cannot do that.') })).toBe('malformed');
    expect(await run({ badJson: true })).toBe('malformed');
    expect(await run({ throws: true })).toBe('network');
    expect(await run({ hang: true }, { timeoutMs: 20 })).toBe('timeout');
  });

  it('can be cancelled', async () => {
    const controller = new AbortController();
    const promise = generateAiQuestions('Space', controller.signal, { ...OPTS, fetchImpl: fakeFetch({ hang: true }).fetchImpl });
    setTimeout(() => controller.abort(), 10);
    expect(await kindOf(() => promise)).toBe('AbortError');
  });
});

describe('describeAiError', () => {
  it('gives friendly messages', () => {
    expect(describeAiError(new QuestionLoadError('config', 'missing-key'))).toContain('.env.local');
    expect(describeAiError(new QuestionLoadError('config', 'missing-model'))).toContain('model name');
    expect(describeAiError(new QuestionLoadError('http', 'x', 0, 401))).toContain('key');
    expect(describeAiError(new QuestionLoadError('rate-limit', 'x', 10_000, 429))).toContain('wait');
    expect(describeAiError(new QuestionLoadError('no-results', 'x'))).toContain('broader');
    expect(describeAiError(new Error('boom'))).toContain('try again');
  });
});

describe('AI games use the same scoring and reset rules', () => {
  const run = (actions: QuizAction[], start: QuizState) => actions.reduce(quizReducer, start);
  const idle: QuizState = { ...initialQuizState, phase: 'idle' };

  it('scores an AI game: +1 for correct, 0 for wrong, then Play again resets after the new set loads', () => {
    const questions = parseAiQuestions(goodReply);
    let state = run([{ type: 'LOAD_START' }, { type: 'LOAD_SUCCESS', questions }], idle);
    expect(state.phase).toBe('playing');

    questions.forEach((q, i) => {
      const pick = i < 3 ? q.correctIndex : (q.correctIndex + 1) % 4; // 3 right, 2 wrong
      state = run([{ type: 'ANSWER', choiceIndex: pick }, { type: 'ANSWER', choiceIndex: q.correctIndex }, { type: 'NEXT', now: 0 }], state);
    });
    expect(state.phase).toBe('finished');
    expect(getScore(state)).toBe(3);

    const next = parseAiQuestions(goodReply);
    state = run([{ type: 'LOAD_START' }, { type: 'LOAD_SUCCESS', questions: next }], state);
    expect(state.phase).toBe('playing');
    expect(state.currentIndex).toBe(0);
    expect(getScore(state)).toBe(0);
  });

  it('keeps the HTTP detail on failure, and New topic returns to the start screen (not while loading)', () => {
    const failed = run([{ type: 'LOAD_START' }, { type: 'LOAD_FAILURE', message: 'busy', detail: 'HTTP 429' }], idle);
    expect(failed.phase).toBe('error');
    expect(failed.errorDetail).toBe('HTTP 429');

    expect(run([{ type: 'RESET' }], failed).phase).toBe('idle');
    const loading = run([{ type: 'LOAD_START' }], failed);
    expect(run([{ type: 'RESET' }], loading)).toBe(loading);
  });
});
