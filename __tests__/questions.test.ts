import { QuestionLoadError } from '../src/data/questionErrors';
import { loadQuestions, validateQuestions } from '../src/data/questionSource';
import { sampleQuestions } from '../test-fixtures/sampleQuestions';

/** Five raw questions shaped like the real Open Trivia Database response. */
export function rawApiQuestions(count = 5) {
  return Array.from({ length: count }, (_, i) => ({
    type: 'multiple',
    difficulty: 'easy',
    category: 'General Knowledge',
    question: `Question number ${i + 1} &quot;quoted&quot;?`,
    correct_answer: `Right ${i + 1}`,
    incorrect_answers: [`Wrong A${i + 1}`, `Wrong B${i + 1}`, `Wrong C${i + 1}`],
  }));
}

const clientReturning = (results: unknown[]) => ({ fetchQuestions: async () => results });

function kindOf(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return error instanceof QuestionLoadError ? error.kind : 'other';
  }
}

describe('validateQuestions', () => {
  const good = sampleQuestions[0];

  it('reports missing or empty data as "empty"', () => {
    expect(kindOf(() => validateQuestions([]))).toBe('empty');
    expect(kindOf(() => validateQuestions(undefined))).toBe('empty');
    expect(kindOf(() => validateQuestions(null))).toBe('empty');
  });

  it('reports broken questions as "invalid"', () => {
    expect(kindOf(() => validateQuestions([{ ...good, choices: ['A', 'B', 'C'] }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([{ ...good, choices: ['A', 'a', 'B', 'C'] }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([{ ...good, choices: ['A', ' ', 'B', 'C'] }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([{ ...good, correctIndex: 4 }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([{ ...good, correctIndex: -1 }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([{ ...good, question: '  ' }]))).toBe('invalid');
    expect(kindOf(() => validateQuestions([good, good]))).toBe('invalid');
  });

  it('accepts good questions', () => {
    expect(kindOf(() => validateQuestions(sampleQuestions))).toBeUndefined();
  });
});

describe('loadQuestions', () => {
  it('returns five playable questions with four distinct choices each', async () => {
    const questions = await loadQuestions(undefined, clientReturning(rawApiQuestions()));
    expect(questions).toHaveLength(5);
    for (const [i, q] of questions.entries()) {
      expect(q.question).toBe(`Question number ${i + 1} "quoted"?`);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices[q.correctIndex]).toBe(`Right ${i + 1}`);
    }
  });

  it('fails clearly when the server sends no questions', async () => {
    await expect(loadQuestions(undefined, clientReturning([]))).rejects.toMatchObject({ kind: 'empty' });
  });

  it('fails clearly when fewer than five questions arrive', async () => {
    await expect(loadQuestions(undefined, clientReturning(rawApiQuestions(3)))).rejects.toMatchObject({
      kind: 'no-results',
    });
  });

  it('rejects malformed questions', async () => {
    const broken = rawApiQuestions();
    (broken[2] as Record<string, unknown>).incorrect_answers = ['only one'];
    await expect(loadQuestions(undefined, clientReturning(broken))).rejects.toMatchObject({ kind: 'malformed' });
  });

  it('rejects a question whose choices become duplicates after decoding', async () => {
    const dup = rawApiQuestions();
    dup[0].correct_answer = 'Tom &amp; Jerry';
    dup[0].incorrect_answers[0] = 'Tom & Jerry';
    await expect(loadQuestions(undefined, clientReturning(dup))).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('passes network errors through unchanged', async () => {
    const failing = {
      fetchQuestions: async () => {
        throw new QuestionLoadError('network', 'offline');
      },
    };
    await expect(loadQuestions(undefined, failing)).rejects.toMatchObject({ kind: 'network' });
  });
});
