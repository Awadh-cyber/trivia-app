import type { Question } from '../types';
import { generalKnowledgeQuestions } from './generalKnowledgeQuestions';

export const CHOICES_PER_QUESTION = 4;

export type QuestionErrorKind = 'empty' | 'invalid';

/** Thrown when question data is missing or broken, so the screen can show a helpful message. */
export class QuestionDataError extends Error {
  kind: QuestionErrorKind;

  constructor(kind: QuestionErrorKind, message: string) {
    super(message);
    this.name = 'QuestionDataError';
    this.kind = kind;
  }
}

/**
 * Checks that every question can be played fairly:
 * real text, exactly four different choices, and one valid correct answer.
 */
export function validateQuestions(data: unknown): Question[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new QuestionDataError('empty', 'No questions were found.');
  }

  const seenIds = new Set<string>();

  data.forEach((item, position) => {
    const label = `Question ${position + 1}`;
    const q = item as Partial<Question> | null;

    if (!q || typeof q.id !== 'string' || q.id.trim() === '') {
      throw new QuestionDataError('invalid', `${label} is missing an id.`);
    }
    if (seenIds.has(q.id)) {
      throw new QuestionDataError('invalid', `${label} repeats the id "${q.id}".`);
    }
    seenIds.add(q.id);

    if (typeof q.question !== 'string' || q.question.trim() === '') {
      throw new QuestionDataError('invalid', `${label} has no question text.`);
    }
    if (!Array.isArray(q.choices) || q.choices.length !== CHOICES_PER_QUESTION) {
      throw new QuestionDataError('invalid', `${label} must have exactly ${CHOICES_PER_QUESTION} answer choices.`);
    }
    if (q.choices.some((choice) => typeof choice !== 'string' || choice.trim() === '')) {
      throw new QuestionDataError('invalid', `${label} has an empty answer choice.`);
    }
    if (new Set(q.choices.map((choice) => choice.trim().toLowerCase())).size !== CHOICES_PER_QUESTION) {
      throw new QuestionDataError('invalid', `${label} has duplicate answer choices.`);
    }
    if (
      typeof q.correctIndex !== 'number' ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex >= CHOICES_PER_QUESTION
    ) {
      throw new QuestionDataError('invalid', `${label} does not mark a valid correct answer.`);
    }
  });

  return data as Question[];
}

/**
 * The single place the app gets its questions from.
 * Today it reads the local list. A later lesson can swap this for an
 * internet or AI source without changing the screens or the game logic.
 */
export async function loadQuestions(): Promise<Question[]> {
  return validateQuestions(generalKnowledgeQuestions);
}
