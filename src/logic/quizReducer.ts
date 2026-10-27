import type { AnswerRecord, Question } from '../types';

export type QuizPhase = 'loading' | 'error' | 'playing' | 'finished';

export interface QuizState {
  phase: QuizPhase;
  questions: Question[];
  currentIndex: number;
  /** One record per answered question, in order. Score is counted from these. */
  answers: AnswerRecord[];
  errorMessage: string | null;
}

export type QuizAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; questions: Question[] }
  | { type: 'LOAD_FAILURE'; message: string }
  | { type: 'ANSWER'; choiceIndex: number }
  | { type: 'NEXT' }
  | { type: 'RESTART' };

export const initialQuizState: QuizState = {
  phase: 'loading',
  questions: [],
  currentIndex: 0,
  answers: [],
  errorMessage: null,
};

/** True once the player has answered the question currently on screen. */
export function isCurrentAnswered(state: QuizState): boolean {
  return state.answers.length > state.currentIndex;
}

export function getCurrentQuestion(state: QuizState): Question | undefined {
  return state.questions[state.currentIndex];
}

export function getCurrentAnswer(state: QuizState): AnswerRecord | undefined {
  return state.answers[state.currentIndex];
}

/** 1 point per correct answer, 0 per incorrect answer. */
export function getScore(state: QuizState): number {
  return state.answers.filter((answer) => answer.isCorrect).length;
}

export function isLastQuestion(state: QuizState): boolean {
  return state.currentIndex === state.questions.length - 1;
}

/**
 * All game rules live here. Every action that is not allowed right now is
 * ignored, so double taps can never answer twice, score twice, or skip ahead.
 */
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...initialQuizState };

    case 'LOAD_SUCCESS':
      return { ...initialQuizState, phase: 'playing', questions: action.questions };

    case 'LOAD_FAILURE':
      return { ...initialQuizState, phase: 'error', errorMessage: action.message };

    case 'ANSWER': {
      const question = getCurrentQuestion(state);
      if (state.phase !== 'playing' || !question || isCurrentAnswered(state)) {
        return state;
      }
      if (
        !Number.isInteger(action.choiceIndex) ||
        action.choiceIndex < 0 ||
        action.choiceIndex >= question.choices.length
      ) {
        return state;
      }
      const record: AnswerRecord = {
        questionId: question.id,
        selectedIndex: action.choiceIndex,
        isCorrect: action.choiceIndex === question.correctIndex,
      };
      return { ...state, answers: [...state.answers, record] };
    }

    case 'NEXT': {
      if (state.phase !== 'playing' || !isCurrentAnswered(state)) {
        return state;
      }
      if (isLastQuestion(state)) {
        return { ...state, phase: 'finished' };
      }
      return { ...state, currentIndex: state.currentIndex + 1 };
    }

    case 'RESTART': {
      if (state.questions.length === 0) {
        return state;
      }
      return { ...initialQuizState, phase: 'playing', questions: state.questions };
    }

    default:
      return state;
  }
}
