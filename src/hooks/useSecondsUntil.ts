import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Whole seconds left until `targetTime` (a Date.now() time), or 0 once it has passed.
 * Uses the real clock, so it stays correct after the app comes back from the background.
 */
export function useSecondsUntil(targetTime: number | null): number {
  // Only used to trigger a re-render; the value is always read fresh from the clock below.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (targetTime === null || Date.now() >= targetTime) return;

    const refresh = () => setTick((tick) => tick + 1);
    const timer = setInterval(() => {
      refresh();
      if (Date.now() >= targetTime) clearInterval(timer);
    }, 250);
    // Timers pause in the background; update right away when the app is opened again.
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [targetTime]);

  if (targetTime === null) return 0;
  return Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
}
