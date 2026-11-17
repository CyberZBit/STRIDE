import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';

type QueryResult<Data> =
  | { status: 'loading' }
  | { status: 'loaded'; data: Data }
  | { status: 'error' };

export function useFocusedQuery<Data>(read: (db: SQLiteDatabase) => Promise<Data>) {
  const db = useSQLiteContext();
  const [result, setResult] = useState<QueryResult<Data>>({ status: 'loading' });

  useFocusEffect(useCallback(() => {
    let active = true;
    read(db).then(
      (data) => {
        if (active) setResult({ status: 'loaded', data });
      },
      (error: unknown) => {
        console.warn('STRIDE could not read session data.', error);
        if (active) setResult({ status: 'error' });
      },
    );
    return () => { active = false; };
  }, [db, read]));

  return result;
}
