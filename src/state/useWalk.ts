import { requireOptionalNativeModule } from 'expo';
import * as Location from 'expo-location';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { newWalkId, saveWalk } from '../db/walks';
import type { DistanceUnit } from '../domain/units';
import { activeWalkTime, appendWalkFixes, emptyWalk, type RoutePoint, type WalkClock, type WalkFix, type WalkProgress } from '../domain/walk';
import { useWalkActivity } from './useWalkActivity';

const sensors = requireOptionalNativeModule<{
  startWalkSensors?: () => Promise<boolean>;
  drainWalkLocations(stop: boolean): Promise<{ fixes: WalkFix[]; interrupted: boolean }>;
  queryWalkSteps(from: number, to: number): Promise<number | null>;
}>('StrideNative');

type Walk = {
  id: string;
  startedAt: number;
  clock: WalkClock;
  endedAt?: number;
  progress: WalkProgress;
  route: RoutePoint[];
  paused: boolean;
  steps: number | null;
};

type Segment = { startedAt: number; previousSteps: number | null };

export function useWalk(unit: DistanceUnit, onSaved: (id: string) => void) {
  const db = useSQLiteContext();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const current = useRef<Walk | null>(null);
  const segment = useRef<Segment | null>(null);
  const working = useRef(false);
  const pendingDrain = useRef<Promise<boolean | undefined> | null>(null);
  const checkingSteps = useRef(false);
  const mounted = useRef(true);
  const syncActivity = useWalkActivity(unit);
  const syncActivityRef = useRef(syncActivity);
  useEffect(() => {
    syncActivityRef.current = syncActivity;
    syncActivity(current.current);
  }, [syncActivity]);

  const update = useCallback((next: Walk | null) => {
    current.current = next;
    setWalk(next);
    syncActivityRef.current(next);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (segment.current) void sensors?.drainWalkLocations(true).catch(() => undefined);
      segment.current = null;
    };
  }, []);

  const drain = useCallback(async (stop: boolean) => {
    if (!sensors || !segment.current) return;
    const activeSegment = segment.current;
    const batch = await sensors.drainWalkLocations(stop);
    // A pending poll may finish during a manual stop. Its earlier fixes still
    // belong to this segment, while a poll from a previous segment does not.
    const active = current.current;
    if (!mounted.current || !active || segment.current !== activeSegment) return;
    if (batch.fixes.length) {
      const result = appendWalkFixes(active, batch.fixes, activeSegment.startedAt, Date.now());
      if (result.route !== active.route) update({ ...active, ...result });
    }
    return batch.interrupted;
  }, [update]);

  const readSteps = useCallback(async (activeSegment: Segment, until: number) => {
    try {
      const count = await sensors?.queryWalkSteps(activeSegment.startedAt, until);
      if (count !== null && count !== undefined) return (activeSegment.previousSteps ?? 0) + count;
    } catch (error) {
      console.warn('STRIDE could not read steps.', error);
    }
    return null;
  }, []);

  const stopSegment = useCallback(async (stoppedAt: number) => {
    const activeSegment = segment.current;
    if (!activeSegment) return;
    await pendingDrain.current?.catch(() => undefined);
    await drain(true);
    segment.current = null;
    const active = current.current;
    if (active) update({
      ...active,
      paused: true,
      clock: { activeMs: activeWalkTime(active.clock, stoppedAt), resumedAt: null },
      progress: { ...active.progress, lastFix: null },
    });
    // Query through the stop time so late Core Motion updates are included.
    const finalSteps = await readSteps(activeSegment, stoppedAt);
    if (current.current && finalSteps !== null) update({ ...current.current, steps: finalSteps });
  }, [drain, readSteps, update]);

  const hasUnfinishedWalk = walk !== null && walk.endedAt === undefined;
  useEffect(() => {
    if (!hasUnfinishedWalk) return;
    let lastStepCheck = 0;
    const tick = async () => {
      if (!mounted.current) return;
      const time = Date.now();
      setNow(time);
      syncActivityRef.current(current.current);
      if (working.current || pendingDrain.current || !segment.current) return;
      const pending = drain(false);
      pendingDrain.current = pending;
      try {
        const interrupted = await pending;
        pendingDrain.current = null;
        if (interrupted && !working.current && segment.current) {
          working.current = true;
          setBusy(true);
          try {
            await stopSegment(Date.now());
            setMessage('Location became unavailable. Check Location Services, then resume.');
          } finally {
            working.current = false;
            setBusy(false);
          }
          return;
        }
      } catch (error) {
        console.warn('STRIDE could not read location updates.', error);
      } finally {
        if (pendingDrain.current === pending) pendingDrain.current = null;
      }
      const activeSegment = segment.current;
      if (activeSegment && !working.current && !checkingSteps.current && AppState.currentState === 'active'
        && time - lastStepCheck >= 4000) {
        lastStepCheck = time;
        checkingSteps.current = true;
        try {
          const steps = await readSteps(activeSegment, time);
          const active = current.current;
          if (mounted.current && active && !working.current && segment.current === activeSegment
            && steps !== null && active.steps !== steps) update({ ...active, steps });
        } finally {
          checkingSteps.current = false;
        }
      }
    };
    const timer = setInterval(() => void tick(), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [drain, hasUnfinishedWalk, readSteps, stopSegment, update]);

  async function startOrResume() {
    if (working.current || segment.current || current.current?.endedAt !== undefined) return;
    working.current = true;
    setBusy(true);
    setMessage(null);
    try {
      if (!sensors?.startWalkSensors) {
        setMessage('Install the current STRIDE iPhone build to record a walk.');
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage('Enable While Using the App and Precise Location for STRIDE in iPhone Settings.');
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) {
        setMessage('Turn on Location Services in iPhone Settings.');
        return;
      }
      const existing = current.current;
      const id = existing?.id ?? await newWalkId(db);
      if (!mounted.current) return;
      const startedAt = Date.now();
      if (!await sensors.startWalkSensors()) {
        setMessage('Could not begin background-capable GPS. Return to STRIDE and try again.');
        return;
      }
      if (!mounted.current) {
        await sensors.drainWalkLocations(true);
        return;
      }
      segment.current = { startedAt, previousSteps: existing?.steps ?? null };
      setNow(startedAt);
      update(existing ? { ...existing, paused: false, clock: { ...existing.clock, resumedAt: startedAt } } : {
        id, startedAt, clock: { activeMs: 0, resumedAt: startedAt }, progress: emptyWalk, route: [], paused: false, steps: null,
      });
    } catch {
      setMessage('Could not start location tracking. Try again.');
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function pause() {
    if (working.current || !segment.current) return;
    working.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await stopSegment(Date.now());
    } catch {
      setMessage('Could not pause the walk. Try again.');
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function finish() {
    if (working.current || !current.current) return;
    working.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const stoppedAt = Date.now();
      await stopSegment(stoppedAt);
      const active = current.current;
      if (!active) return;
      const completed = { ...active, paused: true, endedAt: active.endedAt ?? Math.max(active.startedAt, stoppedAt) };
      update(completed);
      await saveWalk(db, completed);
      if (mounted.current) {
        update(null);
        onSaved(completed.id);
      }
    } catch {
      if (mounted.current) setMessage('Could not save the walk. Try again.');
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const elapsed = walk ? activeWalkTime(walk.clock, now) : 0;
  return { walk, elapsed, busy, message, startOrResume, pause, finish };
}
