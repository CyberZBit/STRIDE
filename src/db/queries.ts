import type { SQLiteDatabase } from 'expo-sqlite';
import type { DistanceUnit } from '../domain/units';

export type WalkingOverview = {
  todayMeters: number;
  weekMeters: number;
};

export type CompletedSession = {
  id: string;
  started_at: number;
  elapsed_duration: number;
  moving_duration: number;
  walking_distance_meters: number;
  average_speed: number;
  maximum_speed: number;
  steps: number | null;
};

export async function readWalkingOverview(
  db: Pick<SQLiteDatabase, 'getFirstAsync'>,
  today: number,
  week: number,
  tomorrow: number,
): Promise<WalkingOverview> {
  const result = await db.getFirstAsync<WalkingOverview>(
    `SELECT
       COALESCE(SUM(CASE WHEN started_at >= ? THEN walking_distance_meters ELSE 0 END), 0) AS todayMeters,
       COALESCE(SUM(walking_distance_meters), 0) AS weekMeters
     FROM sessions
     WHERE status = 'completed' AND started_at >= ? AND started_at < ?`,
    today, week, tomorrow,
  );

  if (!result) throw new Error('The walking overview query did not return a row.');
  return result;
}

export function readCompletedSessions(db: SQLiteDatabase): Promise<CompletedSession[]> {
  return db.getAllAsync<CompletedSession>(
    `SELECT id, started_at, elapsed_duration, moving_duration, walking_distance_meters,
            average_speed, maximum_speed, steps
     FROM sessions
     WHERE status = 'completed'
     ORDER BY started_at DESC, id`,
  );
}

export async function readDistanceUnit(db: SQLiteDatabase): Promise<DistanceUnit> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'distance_unit',
  );

  return row?.value === 'mi' ? 'mi' : 'km';
}

export async function writeDistanceUnit(db: SQLiteDatabase, unit: DistanceUnit): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    'distance_unit', unit,
  );
}
