import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface ProgressIndicatorProps {
  current: number;
  total: number;
}

/** "Question 2 of 5" plus a bar that fills up as the player moves on. */
export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Question ${current} of ${total}`}
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <Text style={styles.text}>
        Question {current} of {total}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.turquoise,
  },
});
