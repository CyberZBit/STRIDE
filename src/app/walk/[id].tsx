import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteWalk, readWalkDetails } from '../../db/walks';
import { formatSessionDate } from '../../domain/calendar';
import { formatDistance } from '../../domain/units';
import { usePreferences } from '../../state/preferences';
import { useFocusedQuery } from '../../state/useFocusedQuery';
import { PageHeader, Panel, SectionHeading, pageContent } from '../../ui/layout';
import { RouteMap } from '../../ui/RouteMap';
import { WalkStats } from '../../ui/WalkStats';
import { colors, fonts } from '../../ui/theme';

function FinishHeading({ date }: { date: string }) {
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      if (reduced) entrance.setValue(1);
      else Animated.timing(entrance, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }).catch(() => { if (mounted) entrance.setValue(1); });
    return () => { mounted = false; entrance.stopAnimation(); };
  }, [entrance]);
  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({
      inputRange: [0, 1], outputRange: [8, 0],
    }) }] }}>
      <PageHeader title="Nice work!" description={date} />
    </Animated.View>
  );
}

export default function WalkDetails() {
  const { id, finished } = useLocalSearchParams<{ id: string; finished?: string }>();
  const justFinished = finished === '1';
  const router = useRouter();
  const db = useSQLiteContext();
  const { unit } = usePreferences();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const read = useCallback((database: SQLiteDatabase) => readWalkDetails(database, id), [id]);
  const result = useFocusedQuery(read);
  const details = result.status === 'loaded' ? result.data : undefined;

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(justFinished ? '/' : '/history');
  }

  function confirmDelete() {
    Alert.alert('Delete this walk?', 'The saved route and statistics will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete walk', style: 'destructive', onPress: async () => {
        setDeleting(true);
        setError(false);
        try {
          await deleteWalk(db, id);
          close();
        } catch {
          setError(true);
          setDeleting(false);
        }
      } },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={pageContent} contentInsetAdjustmentBehavior="never">
        {details ? (
          <>
            {justFinished ? <FinishHeading date={formatSessionDate(details.session.started_at)} /> :
              <PageHeader title="Walk details" description={formatSessionDate(details.session.started_at)} />}
            <Panel>
              <View style={styles.stats}>
                <Text style={styles.label}>WALKING DISTANCE</Text>
                <Text style={styles.distance}>{formatDistance(details.session.walking_distance_meters, unit)} {unit}</Text>
                <WalkStats session={details.session} unit={unit} />
              </View>
            </Panel>
            <View style={styles.route}>
              <SectionHeading>Your route</SectionHeading>
              <RouteMap route={details.route} />
            </View>
            {!justFinished ? (
              <Pressable accessibilityRole="button" disabled={deleting} onPress={confirmDelete} style={styles.delete}>
                <Text style={styles.deleteLabel}>{deleting ? 'Deleting walk…' : 'Delete walk'}</Text>
              </Pressable>
            ) : null}
            {error ? <Text style={styles.deleteLabel}>Could not delete this walk. Please try again.</Text> : null}
          </>
        ) : (
          <PageHeader title="Walk details" description={result.status === 'loading' ? 'Loading walk…' :
            result.status === 'error' ? 'Could not read this walk.' : 'This walk could not be found.'} />
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable accessibilityRole="button" disabled={deleting} onPress={close} style={styles.done}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stats: { gap: 4, padding: 18 },
  label: { fontFamily: fonts.emphasis, fontSize: 12, letterSpacing: 1, color: colors.muted },
  distance: { fontFamily: fonts.display, fontSize: 49, color: colors.accent },
  route: { gap: 10 },
  footer: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 10 },
  done: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accent },
  doneLabel: { fontFamily: fonts.emphasis, fontSize: 16, color: colors.accentInk },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { fontFamily: fonts.emphasis, fontSize: 15, color: colors.danger },
});
