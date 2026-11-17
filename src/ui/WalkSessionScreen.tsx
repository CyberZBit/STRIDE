import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { formatDistance, formatDuration, formatSteps, type DistanceUnit } from '../domain/units';
import type { useWalk } from '../state/useWalk';
import { RouteMap } from './RouteMap';
import { colors, fonts } from './theme';

type Tracking = ReturnType<typeof useWalk>;

export function WalkSessionScreen({ tracking, walk, unit }: {
  tracking: Tracking;
  walk: NonNullable<Tracking['walk']>;
  unit: DistanceUnit;
}) {
  const ended = walk.endedAt !== undefined;
  const status = ended ? (tracking.busy ? 'Saving walk…' : 'Walk ended') :
    walk.paused ? 'Walk paused' : 'Walk in session';

  return (
    <Modal animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <View style={styles.content}>
            <View style={styles.header} accessibilityLiveRegion="polite">
              <View style={[styles.dot, walk.paused && styles.pausedDot]} />
              <Text accessibilityRole="header" style={styles.title}>{status}</Text>
            </View>
            <View style={styles.stats}>
              <Metric label="Steps" value={formatSteps(walk.steps)} primary />
              <Metric label="Distance" value={`${formatDistance(walk.progress.distanceMeters, unit)} ${unit}`} />
              <Metric label="Active time" value={formatDuration(tracking.elapsed)} />
            </View>
            <RouteMap route={walk.route} live={!ended} expand />
            {tracking.message ? <Text style={styles.message}>{tracking.message}</Text> : null}
            <View style={styles.actions}>
              {!ended ? (
                <Pressable accessibilityRole="button" disabled={tracking.busy}
                  onPress={walk.paused ? tracking.startOrResume : tracking.pause} style={[styles.button, styles.secondary]}>
                  <Text style={styles.secondaryLabel}>{walk.paused ? 'Resume' : 'Pause'}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" disabled={tracking.busy} onPress={tracking.finish}
                style={[styles.button, styles.end, tracking.busy && styles.disabled]}>
                <Text style={styles.endLabel}>{ended ? (tracking.busy ? 'Saving…' : 'Retry save') : 'End walk'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function Metric({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, primary && styles.primaryValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 20, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  pausedDot: { backgroundColor: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 35, color: colors.text },
  stats: { flexDirection: 'row', gap: 10, padding: 13, backgroundColor: colors.surface,
    borderRadius: 16, borderColor: colors.border, borderWidth: 1 },
  metric: { flex: 1, gap: 3 },
  metricLabel: { fontFamily: fonts.emphasis, fontSize: 13, color: colors.muted },
  metricValue: { fontFamily: fonts.display, fontSize: 32, color: colors.text },
  primaryValue: { color: colors.accent },
  message: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', gap: 10 },
  button: { minHeight: 54, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 14 },
  secondary: { flex: 1, backgroundColor: colors.raised },
  end: { flex: 2, backgroundColor: colors.accent },
  disabled: { opacity: 0.7 },
  secondaryLabel: { fontFamily: fonts.emphasis, fontSize: 16, color: colors.text },
  endLabel: { fontFamily: fonts.emphasis, fontSize: 16, color: colors.accentInk },
});
