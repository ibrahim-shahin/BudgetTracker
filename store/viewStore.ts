import { create } from 'zustand';

import type { PeriodKey } from '@/utils/dates';

// Which budget month the Budget, Expenses and Insights tabs show. Not saved:
// the app opens on the current month.
interface ViewState {
  /** null means the current month. */
  period: PeriodKey | null;
  setPeriod: (period: PeriodKey | null) => void;
  /** Set when the saved data couldn't be read at start-up. */
  loadError: string | null;
}

export const useViewStore = create<ViewState>()(set => ({
  period: null,
  setPeriod: period => set({ period }),
  loadError: null,
}));
