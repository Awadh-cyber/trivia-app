import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressIndicator } from '../components/ProgressIndicator';
import { QuestionCard } from '../components/QuestionCard';
import { ResultsSummary } from '../components/ResultsSummary';
import { ScoreDisplay } from '../components/ScoreDisplay';
import { StatusMessage } from '../components/StatusMessage';
import { useQuiz } from '../hooks/useQuiz';
import { colors, MAX_CONTENT_WIDTH, spacing } from '../theme';

/** The single game screen: loading, error, quiz and results all live here. */
export function GameScreen() {
  const quiz = useQuiz();
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Jump back to the top for each new question and for the results.
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [quiz.questionNumber, quiz.phase]);

  function renderContent() {
    if (quiz.phase === 'loading') {
      return <StatusMessage loading title="Loading questions…" />;
    }

    if (quiz.phase === 'error') {
      return (
        <StatusMessage
          emoji="😕"
          title="We couldn’t load the questions"
          message={quiz.errorMessage ?? 'Something went wrong with the question data.'}
          actionTitle="Try again"
          onAction={quiz.retry}
        />
      );
    }

    if (quiz.phase === 'finished') {
      return <ResultsSummary score={quiz.score} total={quiz.totalQuestions} onPlayAgain={quiz.restart} />;
    }

    if (!quiz.question) {
      return (
        <StatusMessage
          emoji="📭"
          title="No questions to show"
          message="There are no questions available right now."
          actionTitle="Try again"
          onAction={quiz.retry}
        />
      );
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
              <Text style={styles.category}>🌍 General Knowledge</Text>
            </View>
            {(quiz.phase === 'playing' || quiz.phase === 'finished') && (
              <ScoreDisplay score={quiz.score} total={quiz.totalQuestions} />
            )}
          </View>

          {renderContent()}
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
});
