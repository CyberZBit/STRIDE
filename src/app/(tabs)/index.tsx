import { Link } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { readWalkingOverview } from '../../db/queries';
import { formatHomeDate, getWalkingPeriods } from '../../domain/calendar';
import { type DistanceUnit, formatDistance } from '../../domain/units';
import { usePreferences } from '../../state/preferences';
import { useFocusedQuery } from '../../state/useFocusedQuery';
import { Icon } from '../../ui/Icon';
import { Page, SectionHeading } from '../../ui/layout';
import { colors, fonts } from '../../ui/theme';

function Distance({ meters, unit, hero = false }: {
  meters: number | undefined;
  unit: DistanceUnit;
  hero?: boolean;
}) {
  return (
    <Text style={hero ? styles.heroNumber : styles.weekNumber}>
      {meters === undefined ? '—' : (
        <>{formatDistance(meters, unit)}<Text style={styles.unit}> {unit}</Text></>
      )}
    </Text>
  );
}

export default function Home() {
  const { unit } = usePreferences();
  const [now, setNow] = useState(Date.now);
  const { today, week, tomorrow } = getWalkingPeriods(now);
  const readOverview = useCallback(
    (db: SQLiteDatabase) => readWalkingOverview(db, today, week, tomorrow),
    [today, week, tomorrow],
  );
  const overview = useFocusedQuery(readOverview);
  const data = overview.status === 'loaded' ? overview.data : undefined;

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return (
    <Page>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View style={styles.brandMark} accessible={false}>
            <View style={[styles.markLine, styles.markLineShort]} />
            <View style={styles.markLine} />
          </View>
          <Text accessibilityRole="header" style={styles.wordmark}>STRIDE</Text>
        </View>
        <View style={styles.date}>
          <Icon name="calendar" size={14} />
          <Text style={styles.dateLabel}>{formatHomeDate(now)}</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View
          accessible={false}
          accessibilityElementsHidden
          pointerEvents="none"
          style={styles.track}
        >
          <View style={styles.trackLine} />
          <View style={[styles.trackLine, styles.trackLineAccent]} />
          <View style={styles.trackLine} />
          <View style={styles.trackLine} />
        </View>
        <View style={styles.today}>
          <Text style={styles.todayLabel}>TODAY’S WALKING DISTANCE</Text>
          <Distance meters={data?.todayMeters} unit={unit} hero />
        </View>
        <View style={styles.week}>
          <View style={styles.weekLabel}>
            <Icon name="walk" color={colors.accent} size={19} />
            <Text style={styles.label}>This week</Text>
          </View>
          <Distance meters={data?.weekMeters} unit={unit} />
        </View>
      </View>

      {overview.status === 'error' ? <Text style={styles.error}>Could not read walking totals.</Text> : null}

      <View style={styles.startArea}>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityHint="Session tracking is not enabled in this build."
          style={styles.startButton}
        >
          <Icon name="walk" color={colors.accent} size={22} />
          <Text style={styles.startLabel}>Start session</Text>
        </Pressable>
        <Text style={styles.note}>Session tracking becomes available in the next build.</Text>
      </View>

      <View style={styles.history}>
        <SectionHeading>Your walks</SectionHeading>
        <Link href="/history" asChild>
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [styles.historyLink, pressed && styles.historyLinkPressed]}
          >
            <View style={styles.historyIcon}><Icon name="history" color={colors.accent} size={20} /></View>
            <View style={styles.historyCopy}>
              <Text style={styles.label}>Session history</Text>
              <Text style={styles.note}>Review your saved walks</Text>
            </View>
            <Icon name="arrow" size={17} />
          </Pressable>
        </Link>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: {
    width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 4, backgroundColor: colors.accent, overflow: 'hidden',
  },
  markLine: {
    width: 5, height: 22, borderRadius: 2, backgroundColor: colors.accentInk, transform: [{ skewX: '-20deg' }],
  },
  markLineShort: { height: 13, marginTop: 7 },
  wordmark: { fontFamily: fonts.display, fontSize: 35, color: colors.text, letterSpacing: 1.1 },
  date: {
    flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
  },
  dateLabel: { fontFamily: fonts.emphasis, fontSize: 12, color: colors.muted },
  summary: {
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22,
    overflow: 'hidden',
  },
  track: {
    position: 'absolute', right: -38, top: -24, width: 205, height: 245, flexDirection: 'row',
    justifyContent: 'flex-end', gap: 17, transform: [{ rotate: '27deg' }],
  },
  trackLine: { width: 3, height: '100%', backgroundColor: '#282529' },
  trackLineAccent: { backgroundColor: '#52301F' },
  today: { paddingHorizontal: 22, paddingTop: 23, paddingBottom: 19, gap: 4 },
  todayLabel: {
    fontFamily: fonts.emphasis, fontSize: 12, color: colors.accent, letterSpacing: 1.1,
  },
  heroNumber: { fontFamily: fonts.display, fontSize: 82, color: colors.text, letterSpacing: -1 },
  unit: { fontFamily: fonts.emphasis, fontSize: 18, color: colors.muted, letterSpacing: 0 },
  week: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10,
    paddingHorizontal: 22, paddingVertical: 15, backgroundColor: '#1C1C1F',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  weekLabel: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  weekNumber: { fontFamily: fonts.display, fontSize: 31, color: colors.text },
  label: { fontFamily: fonts.emphasis, fontSize: 16, color: colors.text },
  startArea: { gap: 9 },
  startButton: {
    minHeight: 58, padding: 13, backgroundColor: colors.accentWash, borderColor: '#58331E',
    borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  startLabel: { fontFamily: fonts.emphasis, fontSize: 17, color: colors.accent },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
  history: { gap: 11, marginTop: 3 },
  historyLink: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 13, backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: 1, borderRadius: 18,
  },
  historyLinkPressed: { backgroundColor: colors.raised },
  historyIcon: {
    width: 43, height: 43, borderRadius: 12, backgroundColor: colors.accentWash,
    alignItems: 'center', justifyContent: 'center',
  },
  historyCopy: { flex: 1, gap: 3 },
});
