import { createOpenTriviaClient, parseRetryAfter, QUESTIONS_URL } from '../src/api/openTriviaDb';
import { QuestionLoadError } from '../src/data/questionErrors';

type Reply = { status?: number; body?: unknown; throws?: boolean; badJson?: boolean; hang?: boolean; retryAfter?: string };

/** A fake fetch that answers token and question URLs from two scripted queues. */
function fakeFetch(tokenReplies: Reply[], questionReplies: Reply[]) {
  const calls: string[] = [];
  const callTimes: number[] = [];
  const fetchImpl = jest.fn((url: string, init?: { signal?: AbortSignal }) => {
    calls.push(url);
    if (url.includes('api.php')) callTimes.push(Date.now());
    const queue = url.includes('api_token.php') ? tokenReplies : questionReplies;
    const reply = queue.shift() ?? { body: { response_code: 0, results: [] } };
    if (reply.throws) return Promise.reject(new TypeError('Network request failed'));
    if (reply.hang) {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    }
    const status = reply.status ?? 200;
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? reply.retryAfter ?? null : null) },
      json: () => (reply.badJson ? Promise.reject(new SyntaxError('bad json')) : Promise.resolve(reply.body)),
    } as Response);
  });
  return { fetchImpl, calls, callTimes };
}

const TOKEN_OK = { body: { response_code: 0, response_message: 'Token Generated Successfully!', token: 'tok1' } };
const QUESTIONS_OK = { body: { response_code: 0, results: [{ q: 1 }, { q: 2 }, { q: 3 }, { q: 4 }, { q: 5 }] } };

function client(fetchImpl: ReturnType<typeof fakeFetch>['fetchImpl'], extra = {}) {
  return createOpenTriviaClient({ fetchImpl, minGapMs: 0, ...extra });
}

async function errorKind(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'no error';
  } catch (error) {
    return error instanceof QuestionLoadError ? error.kind : (error as Error).name;
  }
}

describe('Open Trivia Database client', () => {
  it('gets a session token once, then uses it for every new game', async () => {
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK], [QUESTIONS_OK, QUESTIONS_OK]);
    const api = client(fetchImpl);

    await expect(api.fetchQuestions()).resolves.toHaveLength(5);
    await expect(api.fetchQuestions()).resolves.toHaveLength(5);

    expect(calls).toEqual([
      'https://opentdb.com/api_token.php?command=request',
      `${QUESTIONS_URL}&token=tok1`,
      `${QUESTIONS_URL}&token=tok1`,
    ]);
  });

  it('makes exactly one questions request per game', async () => {
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK], [QUESTIONS_OK]);
    await client(fetchImpl).fetchQuestions();
    expect(calls.filter((url) => url.includes('api.php'))).toHaveLength(1);
  });

  it('still loads questions if the token request fails', async () => {
    const { fetchImpl, calls } = fakeFetch([{ throws: true }], [QUESTIONS_OK]);
    await expect(client(fetchImpl).fetchQuestions()).resolves.toHaveLength(5);
    expect(calls[1]).toBe(QUESTIONS_URL);
  });

  it('code 3 (token not found): gets a new token and retries once', async () => {
    const newToken = { body: { response_code: 0, token: 'tok2' } };
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK, newToken], [{ body: { response_code: 3, results: [] } }, QUESTIONS_OK]);
    await expect(client(fetchImpl).fetchQuestions()).resolves.toHaveLength(5);
    expect(calls).toEqual([
      'https://opentdb.com/api_token.php?command=request',
      `${QUESTIONS_URL}&token=tok1`,
      'https://opentdb.com/api_token.php?command=request',
      `${QUESTIONS_URL}&token=tok2`,
    ]);
  });

  it('code 4 (all questions used): resets the token and retries once', async () => {
    const reset = { body: { response_code: 0, token: 'tok1' } };
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK, reset], [{ body: { response_code: 4, results: [] } }, QUESTIONS_OK]);
    await expect(client(fetchImpl).fetchQuestions()).resolves.toHaveLength(5);
    expect(calls[2]).toBe('https://opentdb.com/api_token.php?command=reset&token=tok1');
  });

  it('never loops: a second token failure becomes an error after one retry', async () => {
    const bad = { body: { response_code: 3, results: [] } };
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK, TOKEN_OK], [bad, bad, bad, bad]);
    expect(await errorKind(client(fetchImpl).fetchQuestions())).toBe('token');
    expect(calls.filter((url) => url.includes('api.php'))).toHaveLength(2);
  });

  it('code 5 or HTTP 429 is a rate limit with a wait time, and is not retried automatically', async () => {
    const limited = { status: 429, body: { response_code: 5, result: [] } };
    const { fetchImpl, calls } = fakeFetch([TOKEN_OK], [limited]);
    const promise = client(fetchImpl).fetchQuestions();
    await expect(promise).rejects.toMatchObject({ kind: 'rate-limit', retryAfterMs: 5000 });
    expect(calls.filter((url) => url.includes('api.php'))).toHaveLength(1);

    const { fetchImpl: f2 } = fakeFetch([TOKEN_OK], [{ body: { response_code: 5, results: [] } }]);
    expect(await errorKind(client(f2).fetchQuestions())).toBe('rate-limit');
  });

  it('turns API response codes 1 and 2 into errors', async () => {
    const { fetchImpl: f1 } = fakeFetch([TOKEN_OK], [{ body: { response_code: 1, results: [] } }]);
    expect(await errorKind(client(f1).fetchQuestions())).toBe('no-results');
    const { fetchImpl: f2 } = fakeFetch([TOKEN_OK], [{ body: { response_code: 2, results: [] } }]);
    expect(await errorKind(client(f2).fetchQuestions())).toBe('malformed');
  });

  it('handles network failures, server errors and broken responses', async () => {
    const cases: [Reply, string][] = [
      [{ throws: true }, 'network'],
      [{ status: 500, body: {} }, 'http'],
      [{ status: 503, badJson: true }, 'http'],
      [{ badJson: true }, 'malformed'],
      [{ body: { response_code: 0 } }, 'malformed'],
      [{ body: { something: 'else' } }, 'malformed'],
      [{ body: { response_code: 0, results: 'nope' } }, 'malformed'],
    ];
    for (const [reply, kind] of cases) {
      const { fetchImpl } = fakeFetch([TOKEN_OK], [reply]);
      expect(await errorKind(client(fetchImpl).fetchQuestions())).toBe(kind);
    }
  });

  it('times out when the server does not answer', async () => {
    const { fetchImpl } = fakeFetch([TOKEN_OK], [{ hang: true }]);
    expect(await errorKind(client(fetchImpl, { timeoutMs: 20 }).fetchQuestions())).toBe('timeout');
  });

  it('can be cancelled, and reports cancellation instead of an error message', async () => {
    const { fetchImpl } = fakeFetch([TOKEN_OK], [{ hang: true }]);
    const controller = new AbortController();
    const promise = client(fetchImpl).fetchQuestions(controller.signal);
    setTimeout(() => controller.abort(), 10);
    expect(await errorKind(promise)).toBe('AbortError');
  });

  it('waits at least 5 seconds between question requests', async () => {
    let clock = 0;
    const { fetchImpl } = fakeFetch([TOKEN_OK], [QUESTIONS_OK, QUESTIONS_OK]);
    const api = createOpenTriviaClient({ fetchImpl, minGapMs: 40, now: () => clock });

    await api.fetchQuestions();
    clock = 10; // Only 10 ms later → must wait the remaining 30 ms.
    const started = Date.now();
    await api.fetchQuestions();
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });

  it('keeps the token-retry request at least the minimum gap after the first one', async () => {
    const { fetchImpl, callTimes } = fakeFetch(
      [TOKEN_OK, { body: { response_code: 0, token: 'tok2' } }],
      [{ body: { response_code: 3, results: [] } }, QUESTIONS_OK],
    );
    await createOpenTriviaClient({ fetchImpl, minGapMs: 60 }).fetchQuestions();
    expect(callTimes).toHaveLength(2);
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(55);
  });

  it('uses Retry-After when the server sends one (but at least 5 s, at most 60 s)', async () => {
    const limited = (retryAfter: string) => ({ status: 429, body: { response_code: 5, result: [] }, retryAfter });
    const waitFor = async (retryAfter: string) => {
      const { fetchImpl } = fakeFetch([TOKEN_OK], [limited(retryAfter)]);
      try {
        await client(fetchImpl).fetchQuestions();
      } catch (error) {
        return (error as QuestionLoadError).retryAfterMs;
      }
    };
    expect(await waitFor('12')).toBe(12_000);
    expect(await waitFor('2')).toBe(5_000);
    expect(await waitFor('600')).toBe(60_000);
    expect(await waitFor('soon')).toBe(5_000);
  });

  it('does not send another questions request until the rate-limit wait is over', async () => {
    let clock = 0;
    const { fetchImpl, callTimes } = fakeFetch(
      [TOKEN_OK],
      [{ status: 429, body: { response_code: 5, result: [] }, retryAfter: '0.05' }, QUESTIONS_OK],
    );
    const api = createOpenTriviaClient({ fetchImpl, minGapMs: 0, now: () => clock });
    await expect(api.fetchQuestions()).rejects.toMatchObject({ kind: 'rate-limit' });
    // retryAfterMs is at least 5000, so with the clock still at 0 the next request must wait.
    clock = 4_990;
    const started = Date.now();
    await api.fetchQuestions();
    expect(Date.now() - started).toBeGreaterThanOrEqual(5);
    expect(callTimes).toHaveLength(2);
  });
});

describe('parseRetryAfter', () => {
  it('reads seconds and dates', () => {
    expect(parseRetryAfter('7')).toBe(7000);
    expect(parseRetryAfter(' 1.5 ')).toBe(1500);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter('')).toBeNull();
    expect(parseRetryAfter('later')).toBeNull();
  });
});
