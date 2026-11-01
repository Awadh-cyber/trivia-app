import { StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_TOPIC_LENGTH } from '../ai/config';
import { colors, radius, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface TopicFormProps {
  topic: string;
  onChangeTopic: (text: string) => void;
  onSubmit: () => void;
  /** True while questions are being written: the box and button are locked. */
  busy: boolean;
  /** e.g. "Please type a topic first." */
  error?: string | null;
  submitTitle?: string;
  submitDisabled?: boolean;
}

/** Where the player types a topic for AI Quiz and taps "Quiz me". */
export function TopicForm({
  topic,
  onChangeTopic,
  onSubmit,
  busy,
  error,
  submitTitle = 'Quiz me',
  submitDisabled = false,
}: TopicFormProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label} nativeID="topicLabel">
        What should your quiz be about?
      </Text>
      <TextInput
        value={topic}
        onChangeText={onChangeTopic}
        onSubmitEditing={onSubmit}
        editable={!busy}
        placeholder="e.g. Space, Football, Ancient Egypt"
        placeholderTextColor={colors.disabledText}
        maxLength={MAX_TOPIC_LENGTH}
        returnKeyType="go"
        autoCapitalize="sentences"
        autoCorrect
        accessibilityLabel="Quiz topic"
        accessibilityLabelledBy="topicLabel"
        accessibilityHint="Type a topic, then tap Quiz me"
        style={[styles.input, error && styles.inputError, busy && styles.inputBusy]}
      />
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          ⚠️ {error}
        </Text>
      )}
      <PrimaryButton
        title={busy ? 'Writing your questions…' : submitTitle}
        onPress={onSubmit}
        disabled={busy || submitDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  label: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  input: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.turquoise,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: colors.incorrect,
  },
  inputBusy: {
    borderColor: colors.track,
    color: colors.textMuted,
  },
  error: {
    color: colors.incorrect,
    fontSize: 16,
    fontWeight: '700',
  },
});
