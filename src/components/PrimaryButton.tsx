import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** "primary" is the filled turquoise button; "secondary" is an outlined one for less important actions. */
  variant?: 'primary' | 'secondary';
}

/** The big button used for Next question, View results, Play again, Retry, Quiz me and New topic. */
export function PrimaryButton({ title, onPress, disabled = false, variant = 'primary' }: PrimaryButtonProps) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.title, secondary && styles.titleSecondary, disabled && styles.titleDisabled]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.turquoise,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: colors.track,
    borderColor: colors.track,
  },
  title: {
    color: colors.turquoiseDark,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  titleSecondary: {
    color: colors.turquoise,
  },
  titleDisabled: {
    color: colors.disabledText,
  },
});
