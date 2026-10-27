import { convertApiQuestions } from '../api/convertQuestions';
import { openTriviaClient } from '../api/openTriviaDb';
import type { Question } from '../types';
import { QuestionLoadError } from './questionErrors';

export const CHOICES_PER_QUESTION = 4;
export const QUESTIONS_PER_GAME = 5;

/**
 * Checks that every question can be played fairly:
 * real text, exactly four different choices, and one valid correct answer.
 */
export function validateQuestions(data: unknown): Question[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new QuestionLoadError('empty', 'No questions were found.');
  }

  const seenIds = new Set<string>();

  data.forEach((item, position) => {
    const label = `Question ${position + 1}`;
    const q = item as Partial<Question> | null;

    if (!q || typeof q.id !== 'string' || q.id.trim() === '') {
      throw new QuestionLoadError('invalid', `${label} is missing an id.`);
    }
    if (seenIds.has(q.id)) {
      throw new QuestionLoadError('invalid', `${label} repeats the id "${q.id}".`);
    }
    seenIds.add(q.id);

    if (typeof q.question !== 'string' || q.question.trim() === '') {
      throw new QuestionLoadError('invalid', `${label} has no question text.`);
    }
    if (!Array.isArray(q.choices) || q.choices.length !== CHOICES_PER_QUESTION) {
      throw new QuestionLoadError('invalid', `${label} must have exactly ${CHOICES_PER_QUESTION} answer choices.`);
    }
    if (q.choices.some((choice) => typeof choice !== 'string' || choice.trim() === '')) {
      throw new QuestionLoadError('invalid', `${label} has an empty answer choice.`);
    }
    if (new Set(q.choices.map((choice) => choice.trim().toLowerCase())).size !== CHOICES_PER_QUESTION) {
      throw new QuestionLoadError('invalid', `${label} has duplicate answer choices.`);
    }
    if (
      typeof q.correctIndex !== 'number' ||
      !Number.isInteger(q.correctIndex) ||
      q.correctIndex < 0 ||
      q.correctIndex >= CHOICES_PER_QUESTION
    ) {
      throw new QuestionLoadError('invalid', `${label} does not mark a valid correct answer.`);
    }
  });

  return data as Question[];
}

interface QuestionClient {
  fetchQuestions: (signal?: AbortSignal) => Promise<unknown[]>;
}

/**
 * The single place the app gets a new game's questions from.
 * Today: five General Knowledge questions from Open Trivia Database.
 * Swap the client to use another source without changing screens or game rules.
 */
export async function loadQuestions(signal?: AbortSignal, client: QuestionClient = openTriviaClient): Promise<Question[]> {
  const results = await client.fetchQuestions(signal);
  if (results.length === 0) {
    throw new QuestionLoadError('empty', 'The server sent no questions.');
  }
  const questions = validateQuestions(convertApiQuestions(results));
  if (questions.length !== QUESTIONS_PER_GAME) {
    throw new QuestionLoadError('no-results', `Expected ${QUESTIONS_PER_GAME} questions but got ${questions.length}.`);
  }
  return questions;
}
