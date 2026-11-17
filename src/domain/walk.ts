export type WalkFix = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  speed?: number | null;
};

export type RoutePoint = WalkFix & { startsSegment: boolean };

export type WalkProgress = {
  lastFix: WalkFix | null;
  distanceMeters: number;
  movingMs: number;
  maximumSpeed: number;
};

export const emptyWalk: WalkProgress = {
  lastFix: null,
  distanceMeters: 0,
  movingMs: 0,
  maximumSpeed: 0,
};

function distanceBetween(start: WalkFix, end: WalkFix): number {
  const radians = Math.PI / 180;
  const latitude = (end.latitude - start.latitude) * radians;
  const longitude = (end.longitude - start.longitude) * radians;
  const arc = Math.sin(latitude / 2) ** 2
    + Math.cos(start.latitude * radians) * Math.cos(end.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(Math.min(1, arc)));
}

export function recordWalkFix(walk: WalkProgress, fix: WalkFix): WalkProgress {
  if (![fix.latitude, fix.longitude, fix.accuracy, fix.timestamp].every(Number.isFinite)
    || Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180
    || fix.accuracy === null || fix.accuracy < 0 || fix.accuracy > 30) return walk;

  const previous = walk.lastFix;
  if (!previous) return { ...walk, lastFix: fix };

  const interval = fix.timestamp - previous.timestamp;
  if (interval <= 0) return walk;
  if (interval > 25_000) return { ...walk, lastFix: fix };

  const meters = distanceBetween(previous, fix);
  if (meters < Math.max(5, (fix.accuracy + (previous.accuracy ?? 0)) / 2)) return walk;

  const speed = meters / (interval / 1000);
  if (speed > 4) return { ...walk, lastFix: fix };

  return {
    lastFix: fix,
    distanceMeters: walk.distanceMeters + meters,
    movingMs: walk.movingMs + interval,
    maximumSpeed: Math.max(walk.maximumSpeed, speed),
  };
}
