import type { CompletedSession } from '../db/queries';
import { getWalkingPeriods } from './calendar';

const dayMs = 86_400_000;
const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const km = 1000;

export const milestoneGroups = [
  { label: 'Walk', value: 'walk' },
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Lifetime', value: 'lifetime' },
  { label: 'Streaks', value: 'streaks' },
] as const;

export type MilestoneGroup = typeof milestoneGroups[number]['value'];
type Metric = 'walks' | 'distance' | 'steps' | 'movingTime';
type Totals = Record<Metric, number>;
type GroupStats = {
  walk: Omit<Totals, 'walks'>;
  day: Totals;
  week: Totals & { days: number };
  lifetime: Totals & { days: number; weeks: number };
  streaks: { days: number; weeks: number };
};

type Goal = {
  label: string;
  unit: 'walk' | 'distance' | 'step' | 'time' | 'day' | 'week';
  targets: readonly number[];
  progress: number;
};

function emptyTotals(): Totals {
  return { walks: 0, distance: 0, steps: 0, movingTime: 0 };
}

function addWalk(totals: Totals, walk: CompletedSession) {
  totals.walks += 1;
  totals.distance += walk.walking_distance_meters;
  totals.steps += walk.steps ?? 0;
  totals.movingTime += walk.moving_duration;
}

function maxTotals(periods: Iterable<Totals>): Totals {
  const best = emptyTotals();
  for (const period of periods) {
    for (const key of ['walks', 'distance', 'steps', 'movingTime'] as const) {
      best[key] = Math.max(best[key], period[key]);
    }
  }
  return best;
}

function longestStreak(starts: Iterable<number>, intervalDays: number): number {
  let longest = 0;
  let streak = 0;
  let previous = -Infinity;
  for (const start of [...starts].sort((a, b) => a - b)) {
    // A Stockholm date can be 23 or 25 hours long when the clocks change.
    streak = Math.round((start - previous) / dayMs) === intervalDays ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = start;
  }
  return longest;
}

function summarize(walks: CompletedSession[]): GroupStats {
  const walk = { distance: 0, steps: 0, movingTime: 0 };
  const days = new Map<number, Totals>();
  const weeks = new Map<number, { totals: Totals; days: Set<number> }>();
  const lifetime = { ...emptyTotals(), days: 0, weeks: 0 };
  for (const session of walks) {
    walk.distance = Math.max(walk.distance, session.walking_distance_meters);
    walk.steps = Math.max(walk.steps, session.steps ?? 0);
    walk.movingTime = Math.max(walk.movingTime, session.moving_duration);
    addWalk(lifetime, session);
    const { today, week } = getWalkingPeriods(session.started_at);
    const day = days.get(today) ?? emptyTotals();
    const weekly = weeks.get(week) ?? { totals: emptyTotals(), days: new Set<number>() };
    addWalk(day, session);
    addWalk(weekly.totals, session);
    weekly.days.add(today);
    days.set(today, day);
    weeks.set(week, weekly);
  }
  let mostDaysInWeek = 0;
  const weeklyTotals: Totals[] = [];
  for (const week of weeks.values()) {
    mostDaysInWeek = Math.max(mostDaysInWeek, week.days.size);
    weeklyTotals.push(week.totals);
  }
  return {
    walk,
    day: maxTotals(days.values()),
    week: { ...maxTotals(weeklyTotals), days: mostDaysInWeek },
    lifetime: { ...lifetime, days: days.size, weeks: weeks.size },
    streaks: { days: longestStreak(days.keys(), 1), weeks: longestStreak(weeks.keys(), 7) },
  };
}

type GoalSpec<Group extends MilestoneGroup> = {
  metric: keyof GroupStats[Group];
  label: string;
  unit: Goal['unit'];
  targets: readonly number[];
};

const goalSpecs: { [Group in MilestoneGroup]: readonly GoalSpec<Group>[] } = {
  walk: [
    { metric: 'distance', label: 'Distance in one walk', unit: 'distance', targets: [0.5, 1, 2, 3, 5, 8, 10, 15, 21.1, 42.2].map(value => value * km) },
    { metric: 'steps', label: 'Steps in one walk', unit: 'step', targets: [500, 1000, 2500, 5000, 7500, 10000, 15000, 20000] },
    { metric: 'movingTime', label: 'Moving time in one walk', unit: 'time', targets: [5, 15, 30, 45, 60, 90, 120, 180, 240].map(value => value * minuteMs) },
  ],
  day: [
    { metric: 'walks', label: 'Walks saved in one day', unit: 'walk', targets: [2, 3, 4, 5, 7, 10] },
    { metric: 'distance', label: 'Distance in one day', unit: 'distance', targets: [2, 5, 10, 15, 20, 30, 50].map(value => value * km) },
    { metric: 'steps', label: 'Steps in one day', unit: 'step', targets: [2000, 5000, 10000, 15000, 20000, 30000, 50000] },
    { metric: 'movingTime', label: 'Moving time in one day', unit: 'time', targets: [30, 60, 90, 120, 180, 240, 360].map(value => value * minuteMs) },
  ],
  week: [
    { metric: 'walks', label: 'Walks saved in one week', unit: 'walk', targets: [2, 3, 5, 7, 10, 14, 20] },
    { metric: 'days', label: 'Walking days in one week', unit: 'day', targets: [2, 3, 4, 5, 6, 7] },
    { metric: 'distance', label: 'Distance in one week', unit: 'distance', targets: [5, 10, 20, 30, 50, 75, 100, 150].map(value => value * km) },
    { metric: 'steps', label: 'Steps in one week', unit: 'step', targets: [10000, 20000, 35000, 50000, 70000, 100000, 150000] },
    { metric: 'movingTime', label: 'Moving time in one week', unit: 'time', targets: [1, 2, 3, 5, 7, 10, 15].map(value => value * hourMs) },
  ],
  lifetime: [
    { metric: 'walks', label: 'Total walks saved', unit: 'walk', targets: [1, 5, 10, 25, 50, 100, 250, 500, 1000] },
    { metric: 'distance', label: 'Total distance', unit: 'distance', targets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000].map(value => value * km) },
    { metric: 'steps', label: 'Total recorded steps', unit: 'step', targets: [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000] },
    { metric: 'movingTime', label: 'Total moving time', unit: 'time', targets: [1, 5, 10, 24, 50, 100, 250, 500, 1000].map(value => value * hourMs) },
    { metric: 'days', label: 'Total walking days', unit: 'day', targets: [1, 7, 14, 30, 60, 100, 180, 365, 730] },
    { metric: 'weeks', label: 'Total walking weeks', unit: 'week', targets: [1, 4, 8, 12, 26, 52, 104] },
  ],
  streaks: [
    { metric: 'days', label: 'Consecutive walking days', unit: 'day', targets: [2, 3, 5, 7, 14, 21, 30, 60, 100, 365] },
    { metric: 'weeks', label: 'Consecutive walking weeks', unit: 'week', targets: [2, 3, 4, 8, 12, 26, 52, 104] },
  ],
};

function goalsFor<Group extends MilestoneGroup>(group: Group, stats: GroupStats): Goal[] {
  return goalSpecs[group].map(({ metric, label, unit, targets }) => ({
    label, unit, targets, progress: Number(stats[group][metric]),
  }));
}

export function calculateMilestones(walks: CompletedSession[]) {
  const stats = summarize(walks);
  const groups = {
    walk: goalsFor('walk', stats),
    day: goalsFor('day', stats),
    week: goalsFor('week', stats),
    lifetime: goalsFor('lifetime', stats),
    streaks: goalsFor('streaks', stats),
  };
  let unlocked = 0;
  let total = 0;
  for (const category of Object.values(groups)) {
    for (const goal of category) {
      total += goal.targets.length;
      unlocked += goal.targets.filter(target => goal.progress >= target).length;
    }
  }
  return { groups, unlocked, total };
}
