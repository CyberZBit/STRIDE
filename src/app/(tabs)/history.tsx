import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { type CompletedSession, readCompletedSessions } from '../../db/queries';
import { formatSessionDate } from '../../domain/calendar';
import { formatDistance, type DistanceUnit } from '../../domain/units';
import { usePreferences } from '../../state/preferences';
import { useFocusedQuery } from '../../state/useFocusedQuery';
import { EmptyState, PageHeader, Panel, ScreenFrame, pageContent } from '../../ui/layout';
import { Icon } from '../../ui/Icon';
import { WalkStats } from '../../ui/WalkStats';
import { colors, fonts } from '../../ui/theme';

function SessionRow({ session, unit }: { session: CompletedSession; unit: DistanceUnit }) {
  return (
    <Panel>
      <View style={styles.session}>
        <Text style={styles.date}>{formatSessionDate(session.started_at)}</Text>
        <Text style={styles.distance}>{formatDistance(session.walking_distance_meters, unit)} {unit}</Text>
        <WalkStats session={session} unit={unit} />
        <Link href={{ pathname: '/walk/[id]', params: { id: session.id } }} asChild>
          <Pressable accessibilityRole="link" style={styles.details}>
            <Text style={styles.detailsLabel}>View route and details</Text>
            <Icon name="arrow" color={colors.accent} size={15} />
          </Pressable>
        </Link>
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
  details: { minHeight: 44, marginTop: 4, borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailsLabel: { color: colors.accent, fontFamily: fonts.emphasis, fontSize: 14 },
  status: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
});
