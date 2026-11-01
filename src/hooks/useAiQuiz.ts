import { useCallback, useRef, useState } from 'react';

import { describeAiError } from '../ai/describeAiError';
import { generateAiQuestions } from '../ai/openRouter';
import { normalizeTopic } from '../ai/prompt';
import { useQuiz } from './useQuiz';

/**
 * AI Quiz: the same game rules as the live quiz, but questions come from the AI
 * for a topic the player types. Nothing loads until the player taps "Quiz me".
 */
export function useAiQuiz() {
  const [topic, setTopicText] = useState('');
  const [topicError, setTopicError] = useState<string | null>(null);
  const [playingTopic, setPlayingTopic] = useState('');
  // The topic used for the current request and for Play again.
  const activeTopic = useRef('');

  const loader = useCallback((signal: AbortSignal) => generateAiQuestions(activeTopic.current, signal), []);
  const quiz = useQuiz({ loader, autoStart: false, describeError: describeAiError });

  const setTopic = (text: string) => {
    setTopicText(text);
    if (topicError) setTopicError(null);
  };

  /** "Quiz me" / "Try again": checks the topic, then asks the AI for a new game. */
  const submit = () => {
    if (quiz.isLoading) return;
    const cleaned = normalizeTopic(topic);
    if (!cleaned) {
      setTopicError('Please type a topic first.');
      return;
    }
    setTopicError(null);
    activeTopic.current = cleaned;
    setPlayingTopic(cleaned);
    quiz.start();
  };

  return {
    ...quiz,
    topic,
    setTopic,
    topicError,
    playingTopic,
    submit,
    /** Back to the topic screen. The typed topic stays in the box. */
    newTopic: quiz.reset,
  };
}
