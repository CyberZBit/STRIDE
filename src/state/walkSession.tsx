import { useRouter } from 'expo-router';
import { createContext, type PropsWithChildren, useContext } from 'react';
import { WalkSessionScreen } from '../ui/WalkSessionScreen';
import { usePreferences } from './preferences';
import { useWalk } from './useWalk';

const WalkSessionContext = createContext<ReturnType<typeof useWalk> | null>(null);

export function WalkSessionProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { unit } = usePreferences();
  const tracking = useWalk(unit, (id) => {
    router.push({ pathname: '/walk/[id]', params: { id, finished: '1' } });
  });
  return (
    <WalkSessionContext.Provider value={tracking}>
      {children}
      {tracking.walk ? <WalkSessionScreen tracking={tracking} walk={tracking.walk} unit={unit} /> : null}
    </WalkSessionContext.Provider>
  );
}

export function useWalkSession() {
  const tracking = useContext(WalkSessionContext);
  if (!tracking) throw new Error('STRIDE walk session is unavailable.');
  return tracking;
}
