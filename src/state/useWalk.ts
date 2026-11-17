import * as Location from 'expo-location';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { newWalkId, saveWalk } from '../db/walks';
import type { DistanceUnit } from '../domain/units';
import { emptyWalk, recordWalkFix, type RoutePoint, type WalkProgress } from '../domain/walk';
import { useWalkActivity } from './useWalkActivity';

type Walk = {
  id: string;
  startedAt: number;
  endedAt?: number;
  progress: WalkProgress;
  route: RoutePoint[];
  paused: boolean;
};

export function useWalk(unit: DistanceUnit, onSaved: (id: string) => void) {
  const db = useSQLiteContext();
  const [walk, setWalk] = useState<Walk | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const current = useRef<Walk | null>(null);
  const working = useRef(false);
  const mounted = useRef(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const generation = useRef(0);
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

  const stopWatcher = useCallback(() => {
    generation.current += 1;
    watcher.current?.remove();
    watcher.current = null;
  }, []);

  const pause = useCallback(() => {
    const active = current.current;
    if (!active || active.paused || active.endedAt !== undefined) return;
    stopWatcher();
    update({ ...active, paused: true, progress: { ...active.progress, lastFix: null } });
  }, [stopWatcher, update]);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && current.current && !current.current.paused) {
        pause();
        setMessage('Walk paused while STRIDE was in the background.');
      }
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      stopWatcher();
    };
  }, [pause, stopWatcher]);

  const hasUnfinishedWalk = walk !== null && walk.endedAt === undefined;
  useEffect(() => {
    if (!hasUnfinishedWalk) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      syncActivityRef.current(current.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasUnfinishedWalk]);

  async function startOrResume() {
    if (working.current || current.current?.endedAt !== undefined) return;
    working.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (!permission.granted) {
        setMessage('Enable While Using the App and Precise Location for STRIDE in iPhone Settings.');
        return;
      }
      if (!await Location.hasServicesEnabledAsync()) {
        if (mounted.current) setMessage('Turn on Location Services in iPhone Settings.');
        return;
      }

      const existing = current.current;
      const id = existing?.id ?? await newWalkId(db);
      if (!mounted.current || AppState.currentState !== 'active') return;
      const startedAt = Date.now();
      setNow(startedAt);
      update(existing ? { ...existing, paused: false } : {
        id, startedAt, progress: emptyWalk, route: [], paused: false,
      });

      const watchGeneration = ++generation.current;
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3 },
        ({ coords, timestamp }) => {
          const active = current.current;
          const receivedAt = Date.now();
          if (generation.current !== watchGeneration || !active || active.paused
            || AppState.currentState !== 'active' || timestamp < startedAt || timestamp > receivedAt) return;
          const progress = recordWalkFix(active.progress, {
            latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, timestamp,
            speed: coords.speed !== null && Number.isFinite(coords.speed) && coords.speed >= 0 ? coords.speed : null,
          });
          if (progress.lastFix && progress !== active.progress) {
            const startsSegment = progress.distanceMeters === active.progress.distanceMeters;
            update({ ...active, progress, route: [...active.route, { ...progress.lastFix, startsSegment }] });
          }
        },
        () => {
          if (generation.current !== watchGeneration) return;
          pause();
          setMessage('Location became unavailable. Resume when GPS is available.');
        },
      );
      if (generation.current === watchGeneration) watcher.current = subscription;
      else subscription.remove();
    } catch {
      if (mounted.current) {
        pause();
        setMessage('Could not start location tracking. Try again.');
      }
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function finish() {
    const active = current.current;
    if (working.current || !active) return;
    working.current = true;
    setBusy(true);
    setMessage(null);
    stopWatcher();
    const completed = { ...active, paused: true, endedAt: active.endedAt ?? Math.max(active.startedAt, Date.now()) };
    update(completed);
    try {
      await saveWalk(db, completed);
      if (mounted.current) {
        update(null);
        onSaved(completed.id);
      }
    } catch {
      if (mounted.current) setMessage('Could not save the walk. Tap Retry save to try again.');
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const elapsed = walk ? Math.max(0, (walk.endedAt ?? now) - walk.startedAt) : 0;
  return { walk, elapsed, busy, message, startOrResume, pause, finish };
}
