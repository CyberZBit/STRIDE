import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { readDistanceUnit, writeDistanceUnit } from '../db/queries';
import type { DistanceUnit } from '../domain/units';

type Preferences = {
  unit: DistanceUnit;
  busy: boolean;
  error: string | null;
  setUnit: (unit: DistanceUnit) => Promise<void>;
};

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [unit, setUnit] = useState<DistanceUnit>('km');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);

  useEffect(() => {
    let current = true;
    readDistanceUnit(db).then(
      (saved) => {
        if (current) setUnit(saved);
      },
      (cause: unknown) => {
        console.warn('STRIDE could not read the distance unit.', cause);
        if (current) setError('Could not read your saved distance unit.');
      },
    ).finally(() => {
      if (current) setBusy(false);
    });
    return () => { current = false; };
  }, [db]);

  async function saveUnit(next: DistanceUnit) {
    if (busy || writing.current || (next === unit && !error)) return;

    writing.current = true;
    setBusy(true);
    setError(null);
    try {
      await writeDistanceUnit(db, next);
      setUnit(next);
    } catch (cause) {
      console.warn('STRIDE could not save the distance unit.', cause);
      setError('Could not save your distance unit. Try again.');
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <PreferencesContext.Provider value={{ unit, busy, error, setUnit: saveUnit }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const preferences = useContext(PreferencesContext);
  if (!preferences) throw new Error('STRIDE preferences are unavailable.');
  return preferences;
}
