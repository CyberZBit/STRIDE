import type { SQLiteDatabase } from 'expo-sqlite';
import type { WalkProgress } from '../domain/walk';

export async function newWalkId(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ id: string }>('SELECT lower(hex(randomblob(16))) AS id');
  if (!row) throw new Error('Could not create a walk ID.');
  return row.id;
}

export async function saveWalk(
  db: SQLiteDatabase,
  walk: { id: string; startedAt: number; endedAt: number; progress: WalkProgress },
): Promise<void> {
  const elapsed = walk.endedAt - walk.startedAt;
  const { distanceMeters, maximumSpeed } = walk.progress;
  const moving = Math.min(elapsed, walk.progress.movingMs);
  await db.runAsync(
    `INSERT INTO sessions (
       id, started_at, ended_at, elapsed_duration, moving_duration, distance_meters,
       walking_distance_meters, average_speed, maximum_speed, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
     ON CONFLICT(id) DO NOTHING`,
    walk.id, walk.startedAt, walk.endedAt, elapsed, moving, distanceMeters,
    distanceMeters, moving ? distanceMeters / (moving / 1000) : 0, maximumSpeed,
  );
}
