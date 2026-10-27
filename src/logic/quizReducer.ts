import type { AnswerRecord, Question } from '../types';

export type QuizPhase = 'loading' | 'error' | 'playing' | 'finished';

export interface QuizState {
  phase: QuizPhase;
  questions: Question[];
  currentIndex: number;
  /** One record per answered question, in order. Score is counted from these. */
  answers: AnswerRecord[];
  errorMessage: string | null;
  /** When Retry may be tapped again (used after a rate limit), as a Date.now() time. */
  retryAvailableAt: number | null;
}

export type QuizAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; questions: Question[] }
  | { type: 'LOAD_FAILURE'; message: string; retryAvailableAt?: number | null }
  | { type: 'ANSWER'; choiceIndex: number }
  | { type: 'NEXT' };

export const initialQuizState: QuizState = {
  phase: 'loading',
  questions: [],
  currentIndex: 0,
  answers: [],
  errorMessage: null,
  retryAvailableAt: null,
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
    // Starting a new game (first launch, Play again or Retry) wipes all progress.
    case 'LOAD_START':
      return { ...initialQuizState };

    // Results only count while we are waiting for them.
    case 'LOAD_SUCCESS':
      if (state.phase !== 'loading') return state;
      return { ...initialQuizState, phase: 'playing', questions: action.questions };

    case 'LOAD_FAILURE':
      if (state.phase !== 'loading') return state;
      return {
        ...initialQuizState,
        phase: 'error',
        errorMessage: action.message,
        retryAvailableAt: action.retryAvailableAt ?? null,
      };

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

    default:
      return state;
  }
}
