import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface ResultsSummaryProps {
  score: number;
  total: number;
  onPlayAgain: () => void;
  /** Button text, e.g. "Play again in 3s", "Loading new questions…", "Retry". */
  playAgainTitle?: string;
  playAgainDisabled?: boolean;
  /** A problem loading the next game, shown above the button. */
  notice?: string | null;
}

function getMessage(score: number, total: number): { emoji: string; text: string } {
  if (score === total) return { emoji: '🏆', text: 'Perfect score! You’re a trivia champion.' };
  if (score >= total * 0.6) return { emoji: '🎉', text: 'Great job! You really know your stuff.' };
  if (score > 0) return { emoji: '👍', text: 'Nice try! Play again to beat your score.' };
  return { emoji: '💪', text: 'Tough round! Give it another go.' };
}

/** Final screen: the score out of the total and a Play again button. */
export function ResultsSummary({
  score,
  total,
  onPlayAgain,
  playAgainTitle = 'Play again',
  playAgainDisabled = false,
  notice,
}: ResultsSummaryProps) {
  const message = getMessage(score, total);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
        {message.emoji}
      </Text>
      <Text style={styles.heading} accessibilityRole="header">
        Quiz complete!
      </Text>

      <View style={styles.scoreCard} accessible accessibilityLabel={`Final score: ${score} out of ${total}`}>
        <Text style={styles.scoreLabel}>Your final score</Text>
        <Text style={styles.score}>
          {score} / {total}
        </Text>
      </View>

      <Text style={styles.message}>{message.text}</Text>

      {notice && (
        <View style={styles.notice} accessibilityLiveRegion="polite">
          <Text style={styles.noticeTitle}>⏳ Couldn’t start a new game yet</Text>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      <View style={styles.button}>
        <PrimaryButton title={playAgainTitle} onPress={onPlayAgain} disabled={playAgainDisabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  emoji: {
    fontSize: 72,
  },
  heading: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.turquoise,
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  scoreLabel: {
    color: colors.textMuted,
    fontSize: 17,
    fontWeight: '700',
  },
  score: {
    color: colors.turquoise,
    fontSize: 56,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: 19,
    lineHeight: 26,
    textAlign: 'center',
  },
  notice: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.turquoise,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  noticeText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  button: {
    alignSelf: 'stretch',
  },
});
