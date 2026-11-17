import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { colors, fonts } from './theme';

export function ScreenFrame({ children }: PropsWithChildren) {
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>{children}</SafeAreaView>;
}

export function Page({ children }: PropsWithChildren) {
  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="never">
        {children}
      </ScrollView>
    </ScreenFrame>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
      {description ? <Text style={styles.body}>{description}</Text> : null}
    </View>
  );
}

export function SectionHeading({ children }: PropsWithChildren) {
  return <Text accessibilityRole="header" style={styles.sectionHeading}>{children}</Text>;
}

export function Panel({ children }: PropsWithChildren) {
  return <View style={styles.panel}>{children}</View>;
}

export function EmptyState({ icon, title, description }: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Panel>
      <View style={styles.emptyState}>
        <View style={styles.iconTile}><Icon name={icon} color={colors.accent} /></View>
        <View style={styles.emptyCopy}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.body}>{description}</Text>
        </View>
      </View>
    </Panel>
  );
}

export function ChoiceControl<Value extends string>({ label, value, choices, onChange, disabled }: {
  label: string;
  value: Value;
  choices: readonly { label: string; value: Value }[];
  onChange: (value: Value) => void;
  disabled?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choices}>
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(choice.value)}
            style={({ pressed }) => [
              styles.choice,
              selected && styles.choiceSelected,
              pressed && !selected && styles.choicePressed,
            ]}
          >
            <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
              {choice.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScreenMessage({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return (
    <View style={styles.screenMessage}>
      <Text style={styles.messageText}>{children}</Text>
      {action}
    </View>
  );
}

export const pageContent = {
  paddingHorizontal: 24,
  paddingTop: 12,
  paddingBottom: 28,
  gap: 24,
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: pageContent,
  header: { gap: 4, paddingTop: 4 },
  pageTitle: { fontFamily: fonts.display, fontSize: 54, color: colors.text, letterSpacing: -0.8 },
  sectionHeading: { fontFamily: fonts.emphasis, fontSize: 19, color: colors.text },
  body: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.emphasis, color: colors.text, fontSize: 16 },
  panel: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: 18, overflow: 'hidden',
  },
  emptyState: { flexDirection: 'row', alignItems: 'center', padding: 17, gap: 13 },
  emptyCopy: { flex: 1, gap: 3 },
  iconTile: {
    width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentWash,
  },
  choices: {
    flexDirection: 'row', gap: 4, padding: 4, backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
  },
  choice: {
    flex: 1, minHeight: 44, paddingHorizontal: 4, paddingVertical: 7, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceSelected: { backgroundColor: colors.accentWash },
  choicePressed: { backgroundColor: colors.raised },
  choiceLabel: { color: colors.muted, fontFamily: fonts.emphasis, fontSize: 13, textAlign: 'center' },
  choiceLabelSelected: { color: colors.accent },
  screenMessage: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16,
    backgroundColor: colors.background,
  },
  messageText: { color: colors.text, fontSize: 16, textAlign: 'center' },
});
