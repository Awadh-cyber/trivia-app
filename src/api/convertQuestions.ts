import { QuestionLoadError } from '../data/questionErrors';
import type { Question } from '../types';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { shuffle } from '../utils/shuffle';

/** The shape of one question as Open Trivia Database sends it. */
interface OpenTriviaQuestion {
  type: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

function isOpenTriviaQuestion(value: unknown): value is OpenTriviaQuestion {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === 'multiple' &&
    typeof v.question === 'string' &&
    typeof v.correct_answer === 'string' &&
    Array.isArray(v.incorrect_answers) &&
    v.incorrect_answers.length === 3 &&
    v.incorrect_answers.every((answer) => typeof answer === 'string')
  );
}

/** A short stable fingerprint of the question text, used to build an id. */
function hashText(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

const clean = (text: string) => decodeHtmlEntities(text).trim();

/**
 * Turns raw API questions into playable questions:
 * decodes HTML codes, and shuffles the four choices once while remembering which is correct.
 */
export function convertApiQuestions(results: unknown[], random: () => number = Math.random): Question[] {
  return results.map((raw, position) => {
    if (!isOpenTriviaQuestion(raw)) {
      throw new QuestionLoadError('malformed', `Question ${position + 1} is not a four-choice question.`);
    }

    const questionText = clean(raw.question);
    const options = shuffle(
      [
        { text: clean(raw.correct_answer), isCorrect: true },
        ...raw.incorrect_answers.map((answer) => ({ text: clean(answer), isCorrect: false })),
      ],
      random,
    );

    return {
      id: `otdb-${position}-${hashText(questionText)}`,
      question: questionText,
      choices: options.map((option) => option.text) as Question['choices'],
      correctIndex: options.findIndex((option) => option.isCorrect),
    };
  });
}
