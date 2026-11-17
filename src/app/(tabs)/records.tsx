import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceControl, Page, PageHeader, Panel } from '../../ui/layout';
import { colors, fonts } from '../../ui/theme';

type Period = 'session' | 'day' | 'week';
const choices = [
  { label: 'Session', value: 'session' },
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
] as const;

const records: Record<Period, readonly string[]> = {
  session: ['Longest distance', 'Most steps', 'Longest duration', 'Fastest average speed', 'Highest recorded speed'],
  day: ['Highest total distance', 'Highest total steps'],
  week: ['Highest total distance', 'Highest total steps'],
};

export default function Records() {
  const [period, setPeriod] = useState<Period>('session');

  return (
    <Page>
      <PageHeader title="Records" description="Personal bests for your sessions, days and weeks." />
      <ChoiceControl label="Record period" value={period} choices={choices} onChange={setPeriod} />
      <Panel>
        {records[period].map((label, index) => (
          <View key={label} style={[styles.row, index > 0 && styles.divider]} accessible accessibilityLabel={`${label}, no record`}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.empty}>—</Text>
          </View>
        ))}
      </Panel>
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 57, flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { flex: 1, color: colors.text, fontFamily: fonts.emphasis, fontSize: 15 },
  empty: { color: colors.muted, fontFamily: fonts.emphasis, fontSize: 19 },
});
