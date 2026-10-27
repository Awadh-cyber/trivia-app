import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface ScoreDisplayProps {
  score: number;
  total: number;
}

/** A small badge that keeps the current score visible. */
export function ScoreDisplay({ score, total }: ScoreDisplayProps) {
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={`Score: ${score} out of ${total}`}
    >
      <Text style={styles.label}>⭐ Score</Text>
      <Text style={styles.value}>
        {score}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderColor: colors.turquoise,
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  value: {
    color: colors.turquoise,
    fontSize: 18,
    fontWeight: '800',
  },
});
