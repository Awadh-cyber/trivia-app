import { useCallback, useEffect, useReducer, useRef } from 'react';

import { getFriendlyErrorMessage, QuestionLoadError } from '../data/questionErrors';
import { loadQuestions } from '../data/questionSource';
import {
  getCurrentAnswer,
  getCurrentQuestion,
  getScore,
  initialQuizState,
  isLastQuestion,
  quizReducer,
} from '../logic/quizReducer';
import { useSecondsUntil } from './useSecondsUntil';

/** Connects the question source and the game rules to the screen. */
export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);

  // Only the newest request may update the game; older ones are cancelled and ignored.
  const latestRequestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  // Blocks double taps from starting two requests before the screen updates.
  const isLoading = useRef(false);

  const startNewGame = useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const requestId = ++latestRequestId.current;

    dispatch({ type: 'LOAD_START' });
    try {
      const questions = await loadQuestions(controller.signal);
      if (requestId !== latestRequestId.current) return;
      dispatch({ type: 'LOAD_SUCCESS', questions });
    } catch (error) {
      if (requestId !== latestRequestId.current || controller.signal.aborted) return;
      const waitMs = error instanceof QuestionLoadError ? error.retryAfterMs : 0;
      dispatch({
        type: 'LOAD_FAILURE',
        message: getFriendlyErrorMessage(error),
        retryAvailableAt: waitMs > 0 ? Date.now() + waitMs : null,
      });
    } finally {
      if (requestId === latestRequestId.current) {
        isLoading.current = false;
        activeController.current = null;
      }
    }
  }, []);

  // Load the first game once, and cancel any pending request if the screen goes away.
  useEffect(() => {
    startNewGame();
    return () => {
      latestRequestId.current++;
      activeController.current?.abort();
      activeController.current = null;
      isLoading.current = false;
    };
  }, [startNewGame]);

  const playAgainWaitSeconds = useSecondsUntil(state.phase === 'finished' ? state.playAgainAvailableAt : null);
  const retryWaitSeconds = useSecondsUntil(state.retryAvailableAt);

  /** Starts a new game only when nothing is loading and every countdown has finished. */
  const requestNewGame = useCallback(() => {
    const now = Date.now();
    if (state.retryAvailableAt !== null && now < state.retryAvailableAt) return;
    if (state.phase === 'finished' && state.playAgainAvailableAt !== null && now < state.playAgainAvailableAt) return;
    startNewGame();
  }, [state.phase, state.playAgainAvailableAt, state.retryAvailableAt, startNewGame]);

  return {
    phase: state.phase,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    retryWaitSeconds,
    playAgainWaitSeconds,
    question: getCurrentQuestion(state),
    currentAnswer: getCurrentAnswer(state),
    questionNumber: state.currentIndex + 1,
    totalQuestions: state.questions.length,
    score: getScore(state),
    isLastQuestion: isLastQuestion(state),
    answer: (choiceIndex: number) => dispatch({ type: 'ANSWER', choiceIndex }),
    next: () => dispatch({ type: 'NEXT', now: Date.now() }),
    playAgain: requestNewGame,
    retry: requestNewGame,
  };
}
