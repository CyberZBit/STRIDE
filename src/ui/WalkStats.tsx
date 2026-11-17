import { StyleSheet, Text, View } from 'react-native';
import type { CompletedSession } from '../db/queries';
import { formatDuration, formatSpeed, formatSteps, type DistanceUnit } from '../domain/units';
import { colors, fonts } from './theme';

export function WalkStats({ session, unit }: { session: CompletedSession; unit: DistanceUnit }) {
  const metrics = [
    { label: 'Duration', value: formatDuration(session.elapsed_duration) },
    { label: 'Moving', value: formatDuration(session.moving_duration) },
    { label: 'Steps', value: formatSteps(session.steps) },
    { label: 'Average speed', value: formatSpeed(session.average_speed, unit) },
    { label: 'Max speed', value: formatSpeed(session.maximum_speed, unit) },
  ];
  return (
    <View style={styles.metrics}>
      {metrics.map(({ label, value }) => (
        <View key={label} style={styles.metric}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metric: { minWidth: 76, gap: 3 },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  value: { color: colors.text, fontFamily: fonts.emphasis, fontSize: 14 },
});
