import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

/**
 * idle      – not answered yet, can be tapped
 * correct   – this is the right answer (shown after answering)
 * incorrect – the player picked this and it is wrong
 * inactive  – another choice, locked after answering
 */
export type AnswerStatus = 'idle' | 'correct' | 'incorrect' | 'inactive';

interface AnswerButtonProps {
  letter: string;
  label: string;
  status: AnswerStatus;
  /** True when the player picked this choice. */
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}

export function AnswerButton({ letter, label, status, isSelected, disabled, onPress }: AnswerButtonProps) {
  // Words and icons explain the result, so color is never the only signal.
  const tag =
    status === 'correct' ? (isSelected ? '✓ Your answer · Correct' : '✓ Correct answer') :
    status === 'incorrect' ? '✗ Your answer · Incorrect' :
    null;

  const accessibilityLabel =
    status === 'correct' ? `${label}. Correct answer${isSelected ? ', your choice' : ''}.` :
    status === 'incorrect' ? `${label}. Your choice. Incorrect.` :
    label;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: isSelected }}
      style={({ pressed }) => [
        styles.button,
        status === 'correct' && styles.correct,
        status === 'incorrect' && styles.incorrect,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.letterBadge,
          status === 'correct' && styles.letterCorrect,
          status === 'incorrect' && styles.letterIncorrect,
        ]}
      >
        <Text style={styles.letterText}>
          {status === 'correct' ? '✓' : status === 'incorrect' ? '✗' : letter}
        </Text>
      </View>
      <View style={styles.textColumn}>
        <Text style={[styles.label, status === 'inactive' && styles.labelInactive]}>{label}</Text>
        {tag && (
          <Text style={[styles.tag, status === 'correct' ? styles.tagCorrect : styles.tagIncorrect]}>{tag}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  pressed: {
    borderColor: colors.turquoise,
    transform: [{ scale: 0.98 }],
  },
  correct: {
    borderColor: colors.correct,
    backgroundColor: colors.correctBg,
    borderWidth: 3,
  },
  incorrect: {
    borderColor: colors.incorrect,
    backgroundColor: colors.incorrectBg,
    borderWidth: 3,
  },
  letterBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterCorrect: {
    backgroundColor: colors.correct,
  },
  letterIncorrect: {
    backgroundColor: colors.incorrect,
  },
  letterText: {
    color: colors.turquoiseDark,
    fontSize: 17,
    fontWeight: '800',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  labelInactive: {
    color: colors.disabledText,
  },
  tag: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagCorrect: {
    color: colors.correct,
  },
  tagIncorrect: {
    color: colors.incorrect,
  },
});
