import { useSyncExternalStore } from 'react';

import { useBudgetStore } from '@/store/budgetStore';

/** True once the saved data has been read from the phone. */
export function useStoreHydrated(): boolean {
  return useSyncExternalStore(
    listener => useBudgetStore.persist.onFinishHydration(listener),
    () => useBudgetStore.persist.hasHydrated(),
  );
}
