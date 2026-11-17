import type { CompletedSession } from '../db/queries';
import { getWalkingPeriods } from './calendar';

type DistanceSteps = { distance: number; steps: number | null };

export type WalkingRecords = {
  session: { distance: number | null; steps: number | null; duration: number | null; average: number | null; peak: number | null };
  day: { distance: number | null; steps: number | null };
  week: { distance: number | null; steps: number | null };
};

function best(current: number | null, next: number | null): number | null {
  return next === null ? current : Math.max(current ?? next, next);
}

function addToPeriod(periods: Map<number, DistanceSteps>, start: number, walk: CompletedSession) {
  const old = periods.get(start) ?? { distance: 0, steps: null };
  periods.set(start, {
    distance: old.distance + walk.walking_distance_meters,
    steps: walk.steps === null ? old.steps : (old.steps ?? 0) + walk.steps,
  });
}

function periodBest(periods: Map<number, DistanceSteps>) {
  let distance: number | null = null;
  let steps: number | null = null;
  for (const period of periods.values()) {
    distance = best(distance, period.distance);
    steps = best(steps, period.steps);
  }
  return { distance, steps };
}

export function calculateWalkingRecords(walks: CompletedSession[]): WalkingRecords {
  const session: WalkingRecords['session'] = { distance: null, steps: null, duration: null, average: null, peak: null };
  const days = new Map<number, DistanceSteps>();
  const weeks = new Map<number, DistanceSteps>();
  for (const walk of walks) {
    session.distance = best(session.distance, walk.walking_distance_meters);
    session.steps = best(session.steps, walk.steps);
    session.duration = best(session.duration, walk.elapsed_duration);
    if (walk.moving_duration > 0) {
      session.average = best(session.average, walk.average_speed);
      session.peak = best(session.peak, walk.maximum_speed);
    }
    const period = getWalkingPeriods(walk.started_at);
    addToPeriod(days, period.today, walk);
    addToPeriod(weeks, period.week, walk);
  }
  return { session, day: periodBest(days), week: periodBest(weeks) };
}
