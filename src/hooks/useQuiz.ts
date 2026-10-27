import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

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

/** After "too many requests", the app waits 5 seconds and tries again by itself, at most this many times. */
export const MAX_AUTO_RETRIES = 3;

/** Connects the question source and the game rules to the screen. */
export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);

  // Only the newest request may update the game; older ones are cancelled and ignored.
  const latestRequestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  // Blocks double taps on Play again / Retry from starting two requests.
  const isLoading = useRef(false);
  // Counts automatic tries since the player last tapped something.
  const autoRetriesUsed = useRef(0);

  const startNewGame = useCallback(async (isAutoRetry = false) => {
    if (isLoading.current) return;
    isLoading.current = true;
    if (!isAutoRetry) autoRetriesUsed.current = 0;

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const requestId = ++latestRequestId.current;

    dispatch({ type: 'LOAD_START' });
    try {
      const questions = await loadQuestions(controller.signal);
      if (requestId !== latestRequestId.current) return;
      autoRetriesUsed.current = 0;
      dispatch({ type: 'LOAD_SUCCESS', questions });
    } catch (error) {
      if (requestId !== latestRequestId.current || controller.signal.aborted) return;
      const waitMs = error instanceof QuestionLoadError ? error.retryAfterMs : 0;
      const autoRetry = waitMs > 0 && autoRetriesUsed.current < MAX_AUTO_RETRIES;
      if (autoRetry) autoRetriesUsed.current++;
      dispatch({
        type: 'LOAD_FAILURE',
        message: getFriendlyErrorMessage(error),
        retryAvailableAt: waitMs > 0 ? Date.now() + waitMs : null,
        autoRetry,
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
    startNewGame(false);
    return () => {
      latestRequestId.current++;
      activeController.current?.abort();
      activeController.current = null;
      isLoading.current = false;
    };
  }, [startNewGame]);

  // After a rate limit, count down until Retry is allowed again.
  const [now, setNow] = useState(() => Date.now());
  const retryAvailableAt = state.retryAvailableAt;
  useEffect(() => {
    if (retryAvailableAt === null) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAvailableAt) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [retryAvailableAt]);
  const retryWaitSeconds = retryAvailableAt === null ? 0 : Math.max(0, Math.ceil((retryAvailableAt - now) / 1000));

  // When the 5-second countdown ends, try again by itself (only while autoRetry is on).
  const shouldAutoRetry = state.phase === 'error' && state.autoRetry && retryWaitSeconds === 0;
  useEffect(() => {
    if (shouldAutoRetry) startNewGame(true);
  }, [shouldAutoRetry, startNewGame]);

  const retry = useCallback(() => {
    if (retryAvailableAt !== null && Date.now() < retryAvailableAt) return;
    startNewGame(false);
  }, [retryAvailableAt, startNewGame]);

  return {
    phase: state.phase,
    errorMessage: state.errorMessage,
    retryWaitSeconds,
    isAutoRetrying: state.phase === 'error' && state.autoRetry,
    autoRetryAttempt: autoRetriesUsed.current,
    question: getCurrentQuestion(state),
    currentAnswer: getCurrentAnswer(state),
    questionNumber: state.currentIndex + 1,
    totalQuestions: state.questions.length,
    score: getScore(state),
    isLastQuestion: isLastQuestion(state),
    answer: (choiceIndex: number) => dispatch({ type: 'ANSWER', choiceIndex }),
    next: () => dispatch({ type: 'NEXT' }),
    playAgain: () => startNewGame(false),
    retry,
  };
}
