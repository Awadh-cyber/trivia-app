import { generalKnowledgeQuestions } from '../src/data/generalKnowledgeQuestions';
import { loadQuestions, QuestionDataError, validateQuestions } from '../src/data/questionSource';

describe('General Knowledge question data', () => {
  it('has exactly five questions', () => {
    expect(generalKnowledgeQuestions).toHaveLength(5);
  });

  it('gives every question four different choices and one valid correct answer', () => {
    for (const q of generalKnowledgeQuestions) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(Number.isInteger(q.correctIndex)).toBe(true);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.question.trim()).not.toBe('');
      expect(q.explanation.trim()).not.toBe('');
    }
  });

  it('marks the right answers', () => {
    const answers = generalKnowledgeQuestions.map((q) => q.choices[q.correctIndex]);
    expect(answers).toEqual(['Pacific Ocean', '366', 'Mars', 'Tokyo', 'Leonardo da Vinci']);
  });

  it('uses unique ids', () => {
    const ids = generalKnowledgeQuestions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('loads the five questions through the question source', async () => {
    await expect(loadQuestions()).resolves.toHaveLength(5);
  });
});

describe('validateQuestions', () => {
  const good = generalKnowledgeQuestions[0];

  function kindOf(data: unknown): string | undefined {
    try {
      validateQuestions(data);
      return undefined;
    } catch (error) {
      return error instanceof QuestionDataError ? error.kind : 'other';
    }
  }

  it('reports missing or empty data as "empty"', () => {
    expect(kindOf([])).toBe('empty');
    expect(kindOf(undefined)).toBe('empty');
    expect(kindOf(null)).toBe('empty');
  });

  it('reports broken questions as "invalid"', () => {
    expect(kindOf([{ ...good, choices: ['A', 'B', 'C'] }])).toBe('invalid');
    expect(kindOf([{ ...good, choices: ['A', 'A', 'B', 'C'] }])).toBe('invalid');
    expect(kindOf([{ ...good, correctIndex: 4 }])).toBe('invalid');
    expect(kindOf([{ ...good, correctIndex: -1 }])).toBe('invalid');
    expect(kindOf([{ ...good, question: '  ' }])).toBe('invalid');
    expect(kindOf([good, good])).toBe('invalid');
  });

  it('accepts the real question bank', () => {
    expect(kindOf(generalKnowledgeQuestions)).toBeUndefined();
  });
});
