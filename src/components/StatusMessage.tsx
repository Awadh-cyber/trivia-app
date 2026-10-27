import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface StatusMessageProps {
  emoji?: string;
  title: string;
  message?: string;
  loading?: boolean;
  actionTitle?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

/** Used for the loading, error and empty states, with an optional recovery button. */
export function StatusMessage({
  emoji,
  title,
  message,
  loading = false,
  actionTitle,
  onAction,
  actionDisabled = false,
}: StatusMessageProps) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {loading && <ActivityIndicator size="large" color={colors.turquoise} />}
      {emoji && (
        <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
          {emoji}
        </Text>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionTitle && onAction && (
        <View style={styles.button}>
          <PrimaryButton title={actionTitle} onPress={onAction} disabled={actionDisabled} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
