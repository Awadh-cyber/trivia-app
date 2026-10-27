import { useCallback, useEffect, useReducer } from 'react';

import { loadQuestions } from '../data/questionSource';
import {
  getCurrentAnswer,
  getCurrentQuestion,
  getScore,
  initialQuizState,
  isLastQuestion,
  quizReducer,
} from '../logic/quizReducer';

/** Connects the question source and the game rules to the screen. */
export function useQuiz() {
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const questions = await loadQuestions();
      dispatch({ type: 'LOAD_SUCCESS', questions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      dispatch({ type: 'LOAD_FAILURE', message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    phase: state.phase,
    errorMessage: state.errorMessage,
    question: getCurrentQuestion(state),
    currentAnswer: getCurrentAnswer(state),
    questionNumber: state.currentIndex + 1,
    totalQuestions: state.questions.length,
    score: getScore(state),
    isLastQuestion: isLastQuestion(state),
    answer: (choiceIndex: number) => dispatch({ type: 'ANSWER', choiceIndex }),
    next: () => dispatch({ type: 'NEXT' }),
    restart: () => dispatch({ type: 'RESTART' }),
    retry: load,
  };
}
