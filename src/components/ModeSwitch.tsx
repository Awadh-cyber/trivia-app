import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

export interface ModeOption<T extends string> {
  value: T;
  label: string;
}

interface ModeSwitchProps<T extends string> {
  options: ModeOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A two-button switch, e.g. "Live quiz" | "AI Quiz". The selected one is filled turquoise and marked ✓. */
export function ModeSwitch<T extends string>({ options, value, onChange }: ModeSwitchProps<T>) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {selected ? '✓ ' : ''}
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabSelected: {
    backgroundColor: colors.turquoise,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.turquoiseDark,
    fontWeight: '800',
  },
});
