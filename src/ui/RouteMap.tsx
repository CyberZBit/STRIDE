import { requireNativeView } from 'expo';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { RoutePoint } from '../domain/walk';
import { colors, fonts } from './theme';

const NativeRouteMap = requireNativeView<{
  points: number[][];
  live: boolean;
  overviewRequest: number;
  style: StyleProp<ViewStyle>;
}>('StrideNative', 'StrideRouteMapView');

export function RouteMap({ route, live = false }: { route: RoutePoint[]; live?: boolean }) {
  const [overviewRequest, setOverviewRequest] = useState(0);
  const points = useMemo(
    () => route.map(point => [point.latitude, point.longitude, Number(point.startsSegment)]),
    [route],
  );

  if (!points.length) {
    return (
      <View style={[styles.card, styles.empty]}>
        <Text style={styles.note}>{live ? 'Waiting for a precise GPS fix.' : 'No GPS route was saved for this walk.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <NativeRouteMap points={points} live={live} overviewRequest={overviewRequest} style={styles.map} />
      <Pressable
        accessibilityRole="button"
        onPress={() => setOverviewRequest(request => request + 1)}
        style={styles.overview}
      >
        <Text style={styles.overviewLabel}>Fit route</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' },
  empty: { minHeight: 80, alignItems: 'center', justifyContent: 'center', padding: 16 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  map: { height: 275, width: '100%' },
  overview: {
    position: 'absolute', right: 10, top: 10, minHeight: 44,
    justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.background,
  },
  overviewLabel: { color: colors.text, fontFamily: fonts.emphasis, fontSize: 13 },
});
