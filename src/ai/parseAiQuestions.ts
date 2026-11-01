import { QuestionLoadError } from '../data/questionErrors';
import { validateQuestions } from '../data/questionSource';
import type { Question } from '../types';
import { shuffle } from '../utils/shuffle';
import { AI_QUESTION_COUNT } from './config';

const MAX_QUESTION_LENGTH = 300;
const MAX_ANSWER_LENGTH = 150;

/**
 * Finds the JSON inside the AI's reply, even if it added ```json fences or a sentence around it.
 * Only JSON.parse is used: the reply is treated as plain text and never run as code.
 * Returns undefined when no valid JSON can be found.
 */
export function extractJson(text: string): unknown {
  const attempts: string[] = [text.trim()];

  const fenced = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fenced) attempts.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) attempts.push(text.slice(firstBrace, lastBrace + 1));

  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) attempts.push(text.slice(firstBracket, lastBracket + 1));

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  return undefined;
}

const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A short stable fingerprint of the question text, used to build an id. */
function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function convertOne(raw: unknown, position: number, random: () => number): Question {
  const label = `AI question ${position + 1}`;
  if (!raw || typeof raw !== 'object') {
    throw new QuestionLoadError('invalid', `${label} is not an object.`);
  }
  const item = raw as Record<string, unknown>;

  if (typeof item.question !== 'string' || clean(item.question) === '') {
    throw new QuestionLoadError('invalid', `${label} has no question text.`);
  }
  if (typeof item.correct_answer !== 'string' || clean(item.correct_answer) === '') {
    throw new QuestionLoadError('invalid', `${label} has no correct answer.`);
  }
  if (
    !Array.isArray(item.incorrect_answers) ||
    item.incorrect_answers.length !== 3 ||
    !item.incorrect_answers.every((answer) => typeof answer === 'string' && clean(answer) !== '')
  ) {
    throw new QuestionLoadError('invalid', `${label} must have exactly 3 incorrect answers.`);
  }

  const questionText = clean(item.question);
  const correct = clean(item.correct_answer);
  const wrong = (item.incorrect_answers as string[]).map(clean);

  if (questionText.length > MAX_QUESTION_LENGTH || [correct, ...wrong].some((a) => a.length > MAX_ANSWER_LENGTH)) {
    throw new QuestionLoadError('invalid', `${label} is too long to show.`);
  }

  // Shuffle once, while remembering which choice is correct.
  const options = shuffle(
    [{ text: correct, isCorrect: true }, ...wrong.map((text) => ({ text, isCorrect: false }))],
    random,
  );

  return {
    id: `ai-${position}-${hashText(questionText)}`,
    question: questionText,
    choices: options.map((option) => option.text) as Question['choices'],
    correctIndex: options.findIndex((option) => option.isCorrect),
  };
}

/**
 * Turns the AI's reply text into exactly five playable questions, or throws a QuestionLoadError.
 * Checks: valid JSON, exactly 5 questions, 4 different choices each, exactly one correct answer.
 */
export function parseAiQuestions(replyText: string, random: () => number = Math.random): Question[] {
  if (replyText.trim() === '') {
    throw new QuestionLoadError('empty', 'The AI sent an empty reply.');
  }

  const parsed = extractJson(replyText);
  if (parsed === undefined) {
    throw new QuestionLoadError('malformed', 'The AI reply did not contain readable JSON.');
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { questions?: unknown }).questions)
      ? (parsed as { questions: unknown[] }).questions
      : null;

  if (list === null) {
    throw new QuestionLoadError('malformed', 'The AI reply had no "questions" list.');
  }
  if (list.length === 0) {
    // The AI followed the rule "return an empty list if you lack reliable information".
    throw new QuestionLoadError('no-results', 'The AI had no reliable questions for this topic.');
  }
  if (list.length !== AI_QUESTION_COUNT) {
    throw new QuestionLoadError('invalid', `Expected ${AI_QUESTION_COUNT} questions but got ${list.length}.`);
  }

  const questions = list.map((raw, i) => convertOne(raw, i, random));
  const texts = new Set(questions.map((q) => q.question.toLowerCase()));
  if (texts.size !== questions.length) {
    throw new QuestionLoadError('invalid', 'The AI repeated a question.');
  }

  // validateQuestions re-checks 4 distinct choices, a valid correct answer and unique ids.
  return validateQuestions(questions);
}
