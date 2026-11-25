import { useBudgetStore } from '@/store/budgetStore';
import type { Category, Expense, HistoryEvent } from '@/types';

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Food',
    budget: 50,
    color: '#EF4444',
    icon: 'coffee',
    createdAt: '2026-11-01T08:00:00.000Z',
    lastResetAt: null,
    pinned: false,
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    categoryId: 'c1',
    amount: 10,
    merchant: '',
    notes: '',
    tags: [],
    date: '2026-11-20',
    createdAt: '2026-11-20T09:00:00.000Z',
    ...overrides,
  };
}

/** Replaces the saved budget data, keeping the store's actions. */
export function setBudgetData(data: { categories?: Category[]; expenses?: Expense[]; events?: HistoryEvent[]; currency?: string }) {
  useBudgetStore.setState({ categories: [], expenses: [], events: [], currency: 'JOD', theme: 'system', ...data });
}
