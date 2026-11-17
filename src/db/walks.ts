import type { SQLiteDatabase } from 'expo-sqlite';
import type { RoutePoint, WalkProgress } from '../domain/walk';
import { completedSessionColumns, type CompletedSession } from './queries';

export async function newWalkId(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ id: string }>('SELECT lower(hex(randomblob(16))) AS id');
  if (!row) throw new Error('Could not create a walk ID.');
  return row.id;
}

export async function saveWalk(
  db: SQLiteDatabase,
  walk: { id: string; startedAt: number; endedAt: number; progress: WalkProgress; route: RoutePoint[] },
): Promise<void> {
  const elapsed = walk.endedAt - walk.startedAt;
  const { distanceMeters, maximumSpeed } = walk.progress;
  const moving = Math.min(elapsed, walk.progress.movingMs);
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const session = await transaction.runAsync(
      `INSERT INTO sessions (
         id, started_at, ended_at, elapsed_duration, moving_duration, distance_meters,
         walking_distance_meters, average_speed, maximum_speed, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
       ON CONFLICT(id) DO NOTHING`,
      walk.id, walk.startedAt, walk.endedAt, elapsed, moving, distanceMeters,
      distanceMeters, moving ? distanceMeters / (moving / 1000) : 0, maximumSpeed,
    );
    if (!session.changes || !walk.route.length) return;
    const insert = await transaction.prepareAsync(
      `INSERT INTO gps_points
         (session_id, latitude, longitude, timestamp, accuracy, speed, starts_segment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const point of walk.route) {
        await insert.executeAsync(
          walk.id, point.latitude, point.longitude, point.timestamp, point.accuracy,
          point.speed ?? null, Number(point.startsSegment),
        );
      }
    } finally {
      await insert.finalizeAsync();
    }
  });
}

export async function readWalkDetails(db: SQLiteDatabase, id: string) {
  const session = await db.getFirstAsync<CompletedSession>(
    `SELECT ${completedSessionColumns} FROM sessions WHERE id = ? AND status = 'completed'`,
    id,
  );
  if (!session) return null;
  const points = await db.getAllAsync<WalkFixRow>(
    `SELECT latitude, longitude, accuracy, timestamp, speed, starts_segment
     FROM gps_points WHERE session_id = ? ORDER BY timestamp, id`,
    id,
  );
  const route = points.map(({ starts_segment, ...point }) => ({
    ...point, startsSegment: starts_segment === 1,
  }));
  return { session, route };
}

type WalkFixRow = Omit<RoutePoint, 'startsSegment'> & { starts_segment: number };

export async function deleteWalk(db: SQLiteDatabase, id: string) {
  await db.runAsync("DELETE FROM sessions WHERE id = ? AND status = 'completed'", id);
}
