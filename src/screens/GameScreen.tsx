import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OPENROUTER_MODEL } from '../ai/config';
import { AI_QUIZ_AVAILABLE_ON_THIS_PLATFORM } from '../ai/openRouterKey';
import { ModeSwitch } from '../components/ModeSwitch';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { QuestionCard } from '../components/QuestionCard';
import { EmptyState, ErrorState, LoadingState } from '../components/QuizStates';
import { ResultsSummary } from '../components/ResultsSummary';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { TopicForm } from '../components/TopicForm';
import { useAiQuiz } from '../hooks/useAiQuiz';
import { useQuiz, type QuizController } from '../hooks/useQuiz';
import { colors, MAX_CONTENT_WIDTH, spacing } from '../theme';

type Mode = 'live' | 'ai';

const MODE_OPTIONS = [
  { value: 'live' as const, label: '🌍 Live quiz' },
  { value: 'ai' as const, label: '🤖 AI Quiz' },
];

/**
 * The single game screen. Live quiz and AI Quiz each keep their own game,
 * so switching modes never loses progress. AI Quiz is phone-only.
 */
export function GameScreen() {
  const live = useQuiz();
  const ai = useAiQuiz();
  const [mode, setMode] = useState<Mode>('live');
  const isAi = mode === 'ai' && AI_QUIZ_AVAILABLE_ON_THIS_PLATFORM;
  const quiz: QuizController = isAi ? ai : live;
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Jump back to the top for each new question, for the results, and when switching modes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [quiz.questionNumber, quiz.phase, mode]);

  function getPlayAgainTitle(): string {
    if (quiz.isLoading) return isAi ? 'Writing your questions…' : 'Loading new questions…';
    if (quiz.errorMessage) {
      const label = isAi ? 'Try again' : 'Retry';
      return quiz.retryWaitSeconds > 0 ? `${label} in ${quiz.retryWaitSeconds}s` : label;
    }
    return quiz.playAgainWaitSeconds > 0 ? `Play again in ${quiz.playAgainWaitSeconds}s` : 'Play again';
  }

  /** The question being played, or the results. Shared by both modes. */
  function renderGame() {
    if (quiz.phase === 'finished') {
      return (
        <ResultsSummary
          score={quiz.score}
          total={quiz.totalQuestions}
          onPlayAgain={quiz.playAgain}
          playAgainTitle={getPlayAgainTitle()}
          playAgainDisabled={quiz.isLoading || quiz.playAgainWaitSeconds > 0 || quiz.retryWaitSeconds > 0}
          notice={quiz.errorMessage}
          noticeDetail={quiz.errorDetail}
          secondaryTitle={isAi ? 'New topic' : undefined}
          onSecondary={isAi ? ai.newTopic : undefined}
          secondaryDisabled={quiz.isLoading}
        />
      );
    }

    if (!quiz.question) {
      return <EmptyState onTryAgain={quiz.retry} />;
    }

    return (
      <View style={styles.quiz}>
        <ProgressIndicator current={quiz.questionNumber} total={quiz.totalQuestions} />
        <QuestionCard question={quiz.question} answer={quiz.currentAnswer} onAnswer={quiz.answer} />
        {quiz.currentAnswer && (
          <PrimaryButton
            title={quiz.isLastQuestion ? 'View results  🏁' : 'Next question  →'}
            onPress={quiz.next}
          />
        )}
      </View>
    );
  }

  function renderLive() {
    if (live.phase === 'loading') return <LoadingState />;

    if (live.phase === 'error' && live.isEmptyResult) {
      return (
        <EmptyState
          onTryAgain={live.retry}
          tryAgainTitle={live.retryWaitSeconds > 0 ? `Try again in ${live.retryWaitSeconds}s` : 'Try again'}
          tryAgainDisabled={live.retryWaitSeconds > 0}
        />
      );
    }

    if (live.phase === 'error') {
      return (
        <ErrorState
          message={live.errorMessage ?? 'Something went wrong while loading questions.'}
          onRetry={live.retry}
          retryTitle={live.retryWaitSeconds > 0 ? `Retry in ${live.retryWaitSeconds}s` : 'Retry'}
          retryDisabled={live.retryWaitSeconds > 0}
        />
      );
    }

    return renderGame();
  }

  function renderAi() {
    if (ai.phase === 'playing' || ai.phase === 'finished') return renderGame();

    const waiting = ai.retryWaitSeconds > 0;
    return (
      <View style={styles.aiStart}>
        <TopicForm
          topic={ai.topic}
          onChangeTopic={ai.setTopic}
          onSubmit={ai.submit}
          busy={ai.isLoading}
          error={ai.topicError}
          submitTitle={waiting ? `Quiz me in ${ai.retryWaitSeconds}s` : 'Quiz me'}
          submitDisabled={waiting}
        />

        {ai.isLoading && (
          <StatusMessage
            loading
            title="Writing your questions…"
            message={`About “${ai.playingTopic}”. Free AI models can take up to 30 seconds.`}
          />
        )}

        {ai.phase === 'error' && !ai.isLoading && (
          <ErrorState
            title="We couldn’t write your questions"
            message={ai.errorMessage ?? 'Something went wrong. Please try again.'}
            detail={ai.errorDetail}
            onRetry={ai.submit}
            retryTitle={waiting ? `Try again in ${ai.retryWaitSeconds}s` : 'Try again'}
            retryDisabled={waiting}
          />
        )}

        {ai.phase === 'idle' && !ai.isLoading && (
          <Text style={styles.hint}>
            Type any topic and the AI will write 5 new multiple-choice questions about it. AI can make mistakes, so
            double-check anything surprising.
          </Text>
        )}
      </View>
    );
  }

  const subtitle = isAi
    ? ai.playingTopic && (ai.phase === 'playing' || ai.phase === 'finished')
      ? `🤖 AI Quiz · ${ai.playingTopic}`
      : '🤖 AI Quiz'
    : '🌍 General Knowledge';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <Text style={styles.appName} accessibilityRole="header">
                Trivia on Your Phone
              </Text>
              <Text style={styles.category}>{subtitle}</Text>
            </View>
            {(quiz.phase === 'playing' || quiz.phase === 'finished') && (
              <ScoreDisplay score={quiz.score} total={quiz.totalQuestions} />
            )}
          </View>

          {AI_QUIZ_AVAILABLE_ON_THIS_PLATFORM && <ModeSwitch options={MODE_OPTIONS} value={mode} onChange={setMode} />}

          {isAi ? renderAi() : renderLive()}

          <Text style={styles.credit}>
            {isAi
              ? `Questions written by AI${OPENROUTER_MODEL ? ` (${OPENROUTER_MODEL})` : ''} via OpenRouter. AI can make mistakes.`
              : 'Questions from Open Trivia Database (opentdb.com), CC BY-SA 4.0'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md + spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flexShrink: 1,
    gap: 2,
  },
  appName: {
    color: colors.turquoise,
    fontSize: 28,
    fontWeight: '900',
  },
  category: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  quiz: {
    gap: spacing.lg,
  },
  aiStart: {
    gap: spacing.lg,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  credit: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
