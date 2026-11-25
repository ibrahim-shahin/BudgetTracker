import { useBudgetStore } from '@/store/budgetStore';
import type { BudgetData } from '@/types';

/** Replaces the saved budget data, keeping the store's actions. */
export function setBudgetData(data: Partial<BudgetData> = {}) {
  useBudgetStore.setState({
    currency: 'JOD',
    periodStartDay: 1,
    theme: 'system',
    categories: [],
    expenses: [],
    ...data,
  });
}
