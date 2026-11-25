import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useBudgetStore } from '@/store/budgetStore';

/** True once the saved data has been read from the phone. */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    listener => useBudgetStore.persist.onFinishHydration(listener),
    () => useBudgetStore.persist.hasHydrated(),
  );
}

/** Adds the recurring expenses that are due, at start-up and whenever the app comes back. */
export function useRecurringCatchUp(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    useBudgetStore.getState().applyRecurring();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') useBudgetStore.getState().applyRecurring();
    });
    return () => subscription.remove();
  }, [enabled]);
}
