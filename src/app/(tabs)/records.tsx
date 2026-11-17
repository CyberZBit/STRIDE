import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { readCompletedSessions } from '../../db/queries';
import { calculateMilestones } from '../../domain/milestones';
import { calculateWalkingRecords, type WalkingRecords } from '../../domain/records';
import { formatDistance, formatDuration, formatSpeed, formatSteps } from '../../domain/units';
import { usePreferences } from '../../state/preferences';
import { useFocusedQuery } from '../../state/useFocusedQuery';
import { ChoiceControl, Page, PageHeader, Panel } from '../../ui/layout';
import { MilestoneBoard } from '../../ui/MilestoneBoard';
import { colors, fonts } from '../../ui/theme';

type Period = 'session' | 'day' | 'week';
const views = [
  { label: 'Personal bests', value: 'bests' },
  { label: 'Milestones', value: 'milestones' },
] as const;
const choices = [
  { label: 'Session', value: 'session' },
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
] as const;

const records = {
  session: [
    ['Longest distance', 'distance'],
    ['Most steps', 'steps'],
    ['Longest duration', 'duration'],
    ['Fastest average speed', 'average'],
    ['Highest recorded speed', 'peak'],
  ],
  day: [['Highest total distance', 'distance'], ['Highest total steps', 'steps']],
  week: [['Highest total distance', 'distance'], ['Highest total steps', 'steps']],
} as const;

function readRecordValue(data: WalkingRecords, period: Period, key: keyof WalkingRecords['session']) {
  if (key === 'distance' || key === 'steps') return data[period][key];
  return data.session[key];
}

export default function Records() {
  const [view, setView] = useState<typeof views[number]['value']>('bests');
  const [period, setPeriod] = useState<Period>('session');
  const { unit } = usePreferences();
  const result = useFocusedQuery(readCompletedSessions);
  const data = useMemo(() => result.status === 'loaded' && view === 'bests' ?
    calculateWalkingRecords(result.data) : null, [result, view]);
  const milestones = useMemo(() => result.status === 'loaded' && view === 'milestones' ?
    calculateMilestones(result.data) : null, [result, view]);

  function formatRecord(key: keyof WalkingRecords['session']) {
    if (!data) return '—';
    const value = readRecordValue(data, period, key);
    if (value === null) return '—';
    if (key === 'distance') return `${formatDistance(value, unit)} ${unit}`;
    if (key === 'duration') return formatDuration(value);
    if (key === 'steps') return formatSteps(value);
    return formatSpeed(value, unit);
  }

  return (
    <Page>
      <PageHeader title="Records" />
      <ChoiceControl label="Records view" value={view} choices={views} onChange={setView} />
      {result.status === 'error' ? <Text style={styles.label}>Could not read saved walks.</Text> : null}
      {result.status === 'loading' ? <Text style={styles.label}>Loading walks…</Text> : null}
      {milestones ? <MilestoneBoard milestones={milestones} unit={unit} /> : null}
      {data ? (
        <>
          <ChoiceControl label="Record period" value={period} choices={choices} onChange={setPeriod} />
          <Panel>
            {records[period].map(([label, key], index) => (
              <View key={label} style={[styles.row, index > 0 && styles.divider]}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{formatRecord(key)}</Text>
              </View>
            ))}
          </Panel>
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 57, flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { flex: 1, color: colors.text, fontFamily: fonts.emphasis, fontSize: 15 },
  value: { color: colors.accent, fontFamily: fonts.emphasis, fontSize: 19 },
});
