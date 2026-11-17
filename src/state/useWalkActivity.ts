import { requireOptionalNativeModule } from 'expo';
import { useCallback, useRef } from 'react';
import { formatDistance, formatDuration, type DistanceUnit } from '../domain/units';

type ActivityWalk = {
  id: string;
  startedAt: number;
  paused: boolean;
  endedAt?: number;
  progress: { distanceMeters: number };
};

const native = requireOptionalNativeModule<{
  setWalkActivity(id: string, startedAt: number, distance: string, paused: boolean, elapsed: string): Promise<void>;
  clearWalkActivities(): Promise<void>;
}>('StrideNative');

export function useWalkActivity(unit: DistanceUnit) {
  const last = useRef<{ key: string; time: number } | null>(null);
  const pending = useRef(Promise.resolve());

  const sync = useCallback((walk: ActivityWalk | null) => {
    if (!native) return;
    const time = Date.now();
    const step = walk && walk.endedAt === undefined ? walk : null;
    const distance = step ? `${formatDistance(step.progress.distanceMeters, unit)} ${unit}` : '';
    const key = step ? `${step.id}/${step.paused}/${distance}` : '';
    if (last.current?.key === key && (!step || step.paused || time - last.current.time < 45_000)) return;
    last.current = { key, time };
    const push = () => step ? native.setWalkActivity(
      step.id, step.startedAt, distance, step.paused, formatDuration(Math.max(0, time - step.startedAt)),
    ) : native.clearWalkActivities();
    // Keep updates ordered so ending a walk cannot leave an older activity on screen.
    pending.current = pending.current.then(push).catch((error: unknown) => {
      if (last.current?.time === time) last.current = null;
      console.warn('STRIDE could not update the Lock Screen walk.', error);
    });
  }, [unit]);

  return sync;
}
