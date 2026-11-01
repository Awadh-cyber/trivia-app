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
import type { Question } from '../types';
import { useSecondsUntil } from './useSecondsUntil';

export type QuestionLoader = (signal: AbortSignal) => Promise<Question[]>;

export interface UseQuizOptions {
  /** Where each new game's questions come from. Defaults to Open Trivia Database. */
  loader?: QuestionLoader;
  /** Load the first game as soon as the screen opens (true) or wait for start() (false). */
  autoStart?: boolean;
  /** Turns an error into a friendly sentence for the player. */
  describeError?: (error: unknown) => string;
}

/** Connects a question source and the game rules to the screen. */
export function useQuiz({
  loader = loadQuestions,
  autoStart = true,
  describeError = getFriendlyErrorMessage,
}: UseQuizOptions = {}) {
  const [state, dispatch] = useReducer(
    quizReducer,
    autoStart ? initialQuizState : { ...initialQuizState, phase: 'idle' as const },
  );

  // Always use the newest loader / message function without restarting anything.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const describeErrorRef = useRef(describeError);
  describeErrorRef.current = describeError;

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
      const questions = await loaderRef.current(controller.signal);
      if (requestId !== latestRequestId.current) return;
      dispatch({ type: 'LOAD_SUCCESS', questions });
    } catch (error) {
      if (requestId !== latestRequestId.current || controller.signal.aborted) return;
      const loadError = error instanceof QuestionLoadError ? error : null;
      const waitMs = loadError?.retryAfterMs ?? 0;
      dispatch({
        type: 'LOAD_FAILURE',
        message: describeErrorRef.current(error),
        detail: loadError?.status ? `HTTP ${loadError.status}` : null,
        retryAvailableAt: waitMs > 0 ? Date.now() + waitMs : null,
        isEmpty: loadError !== null && (loadError.kind === 'empty' || loadError.kind === 'no-results'),
      });
    } finally {
      if (requestId === latestRequestId.current) {
        isLoading.current = false;
        activeController.current = null;
      }
    }
  }, []);

  // Optionally load the first game, and cancel any pending request if the screen goes away.
  useEffect(() => {
    if (autoStart) startNewGame();
    return () => {
      latestRequestId.current++;
      activeController.current?.abort();
      activeController.current = null;
      isLoading.current = false;
    };
    // autoStart is only read once, when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    errorDetail: state.errorDetail,
    isEmptyResult: state.isEmptyResult,
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
    /** Start a game now (used by "Quiz me"). Still respects a rate-limit wait. */
    start: requestNewGame,
    /** Go back to the start screen (AI Quiz "New topic"). */
    reset: () => dispatch({ type: 'RESET' }),
  };
}

export type QuizController = ReturnType<typeof useQuiz>;
