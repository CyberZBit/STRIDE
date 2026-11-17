import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { milestoneGroups, type calculateMilestones, type MilestoneGroup } from '../domain/milestones';
import { formatDistance, formatSteps, type DistanceUnit } from '../domain/units';
import { Icon } from './Icon';
import { ChoiceControl, Panel } from './layout';
import { colors, fonts } from './theme';

type Milestones = ReturnType<typeof calculateMilestones>;
type Goal = Milestones['groups'][MilestoneGroup][number];

const groupDescriptions: Record<MilestoneGroup, string> = {
  walk: 'Your best results in a single walk.',
  day: 'Your best results in a Stockholm calendar day.',
  week: 'Your best results in a week, Monday to Sunday.',
  lifetime: 'Totals across your saved walks.',
  streaks: 'Your longest streaks of consecutive days and weeks.',
};

function formatGoal(value: number, unit: Goal['unit'], distanceUnit: DistanceUnit): string {
  if (unit === 'distance') return `${formatDistance(value, distanceUnit)} ${distanceUnit}`;
  if (unit === 'time') {
    const minutes = Math.floor(value / 60_000);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${minutes} min`;
    return remainder ? `${formatSteps(hours)} h ${remainder} min` : `${formatSteps(hours)} h`;
  }
  return `${formatSteps(value)} ${unit}${value === 1 ? '' : 's'}`;
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = Math.min(100, Math.floor(value / total * 100));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent }} style={styles.track}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

function GoalCard({ goal, unit }: { goal: Goal; unit: DistanceUnit }) {
  const [expanded, setExpanded] = useState(false);
  const next = goal.targets.find(target => goal.progress < target);
  const unlocked = goal.targets.filter(target => goal.progress >= target).length;
  return (
    <Panel>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title}>{goal.label}</Text>
          <Text style={styles.count}>{unlocked}/{goal.targets.length}</Text>
        </View>
        {next === undefined ? <Text style={styles.unlocked}>All tiers unlocked</Text> : (
          <>
            <Text style={styles.detail}>
              {formatGoal(goal.progress, goal.unit, unit)} toward {formatGoal(next, goal.unit, unit)}
            </Text>
            <ProgressBar value={goal.progress} total={next} />
          </>
        )}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? 'Hide' : 'Show'} tiers for ${goal.label}`}
          onPress={() => setExpanded(value => !value)} style={styles.toggle}>
          <Text style={styles.toggleLabel}>{expanded ? 'Hide tiers' : 'Show tiers'}</Text>
        </Pressable>
        {expanded ? goal.targets.map(target => {
          const achieved = goal.progress >= target;
          return (
            <View key={target} style={styles.tier}>
              <Text style={styles.detail}>{formatGoal(target, goal.unit, unit)}</Text>
              <Text style={achieved ? styles.unlocked : styles.detail}>{achieved ? 'Unlocked' : 'Locked'}</Text>
            </View>
          );
        }) : null}
      </View>
    </Panel>
  );
}

export function MilestoneBoard({ milestones, unit }: { milestones: Milestones; unit: DistanceUnit }) {
  const [group, setGroup] = useState<MilestoneGroup>('lifetime');
  return (
    <View style={styles.board}>
      <Panel>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="records" color={colors.accent} size={26} />
            <Text style={styles.hero}>{milestones.unlocked} of {milestones.total} unlocked</Text>
          </View>
          <ProgressBar value={milestones.unlocked} total={milestones.total} />
        </View>
      </Panel>
      <ChoiceControl label="Milestone category" value={group} choices={milestoneGroups} onChange={setGroup} />
      <Text style={styles.detail}>{groupDescriptions[group]}</Text>
      {milestones.groups[group].map(goal => <GoalCard key={goal.label} goal={goal} unit={unit} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: 12 },
  card: { gap: 8, padding: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: colors.text, fontFamily: fonts.emphasis, fontSize: 16 },
  hero: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 32 },
  count: { color: colors.accent, fontFamily: fonts.emphasis, fontSize: 15 },
  detail: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.raised },
  fill: { height: '100%', backgroundColor: colors.accent },
  toggle: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  toggleLabel: { color: colors.accent, fontFamily: fonts.emphasis, fontSize: 14 },
  tier: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8,
    borderTopWidth: 1, borderColor: colors.border },
  unlocked: { color: colors.accent, fontFamily: fonts.emphasis, fontSize: 14, lineHeight: 20 },
});
