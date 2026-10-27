import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface ResultsSummaryProps {
  score: number;
  total: number;
  onPlayAgain: () => void;
}

function getMessage(score: number, total: number): { emoji: string; text: string } {
  if (score === total) return { emoji: '🏆', text: 'Perfect score! You’re a trivia champion.' };
  if (score >= total * 0.6) return { emoji: '🎉', text: 'Great job! You really know your stuff.' };
  if (score > 0) return { emoji: '👍', text: 'Nice try! Play again to beat your score.' };
  return { emoji: '💪', text: 'Tough round! Give it another go.' };
}

/** Final screen: the score out of the total and a Play again button. */
export function ResultsSummary({ score, total, onPlayAgain }: ResultsSummaryProps) {
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

      <View style={styles.button}>
        <PrimaryButton title="Play again" onPress={onPlayAgain} />
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
  button: {
    alignSelf: 'stretch',
  },
});
