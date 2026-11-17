import { initialSchema } from './migrations/001-initial';
import { routeSegments } from './migrations/002-route-segments';

type MigrationDatabase = {
  execAsync(sql: string): Promise<void>;
  getFirstAsync<Row>(sql: string): Promise<Row | null>;
};

export const databaseName = 'stride.db';
const migrations = [initialSchema, routeSegments];

// Initialize the connection before exposing it to consumers.
export async function migrateDatabase(db: MigrationDatabase): Promise<void> {
  await db.execAsync('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await db.execAsync('BEGIN IMMEDIATE;');

  try {
    const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
    if (!result || result.user_version < 0 || result.user_version > migrations.length) {
      throw new Error('The STRIDE database version is unsupported.');
    }

    for (let version = result.user_version; version < migrations.length; version += 1) {
      await db.execAsync(migrations[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1};`);
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;').catch((rollbackError: unknown) => {
      console.warn('STRIDE could not roll back a migration.', rollbackError);
    });
    throw error;
  }
}
