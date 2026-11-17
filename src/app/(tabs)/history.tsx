import { FlatList, StyleSheet, Text, View } from 'react-native';
import { type CompletedSession, readCompletedSessions } from '../../db/queries';
import { formatSessionDate } from '../../domain/calendar';
import { formatDistance, formatDuration, formatSpeed, formatSteps, type DistanceUnit } from '../../domain/units';
import { usePreferences } from '../../state/preferences';
import { useFocusedQuery } from '../../state/useFocusedQuery';
import { EmptyState, PageHeader, Panel, ScreenFrame, pageContent } from '../../ui/layout';
import { colors, fonts } from '../../ui/theme';

function SessionRow({ session, unit }: { session: CompletedSession; unit: DistanceUnit }) {
  const metrics = [
    { label: 'Duration', value: formatDuration(session.elapsed_duration) },
    { label: 'Moving', value: formatDuration(session.moving_duration) },
    { label: 'Steps', value: formatSteps(session.steps) },
    { label: 'Average speed', value: formatSpeed(session.average_speed, unit) },
    { label: 'Max speed', value: formatSpeed(session.maximum_speed, unit) },
  ];

  return (
    <Panel>
      <View style={styles.session}>
        <Text style={styles.date}>{formatSessionDate(session.started_at)}</Text>
        <Text style={styles.distance}>{formatDistance(session.walking_distance_meters, unit)} {unit}</Text>
        <View style={styles.metrics}>
          {metrics.map(({ label, value }) => (
            <View key={label} style={styles.metric}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
    </Panel>
  );
}

export default function History() {
  const { unit } = usePreferences();
  const result = useFocusedQuery(readCompletedSessions);

  return (
    <ScreenFrame>
      <FlatList
        contentContainerStyle={pageContent}
        contentInsetAdjustmentBehavior="never"
        data={result.status === 'loaded' ? result.data : []}
        keyExtractor={(session) => session.id}
        renderItem={({ item }) => <SessionRow session={item} unit={unit} />}
        ListHeaderComponent={<PageHeader title="History" description="Your saved walks, newest first." />}
        ListEmptyComponent={
          result.status === 'loaded' ? (
            <EmptyState icon="history" title="No walks yet" description="Completed sessions will appear here." />
          ) : (
            <Text style={styles.status}>
              {result.status === 'loading' ? 'Loading walks…' : 'Could not read session history.'}
            </Text>
          )
        }
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  session: { padding: 17, gap: 8 },
  date: { fontFamily: fonts.emphasis, fontSize: 15, color: colors.text },
  distance: { fontFamily: fonts.display, fontSize: 31, color: colors.accent },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metric: { minWidth: 76, gap: 3 },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  value: { color: colors.text, fontFamily: fonts.emphasis, fontSize: 14 },
  status: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
});
