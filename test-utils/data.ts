import type { BudgetData, Category, Expense, RecurringExpense } from '@/types';

export function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'food',
    name: 'Food',
    budgets: [{ from: '2026-01', amount: 200000 }],
    color: '#EF4444',
    icon: 'shopping-cart',
    createdAt: '2026-01-01T08:00:00.000Z',
    pinned: false,
    ...overrides,
  };
}

export function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    categoryId: 'food',
    amount: 12500,
    merchant: 'Carrefour',
    notes: '',
    tags: [],
    date: '2026-11-20',
    createdAt: '2026-11-20T09:00:00.000Z',
    ...overrides,
  };
}

export function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'rent',
    categoryId: 'food',
    amount: 350000,
    merchant: 'Landlord',
    notes: '',
    tags: [],
    frequency: 'monthly',
    startDate: '2026-01-31',
    lastAdded: null,
    paused: false,
    createdAt: '2026-01-31T08:00:00.000Z',
    ...overrides,
  };
}

export function budgetData(overrides: Partial<BudgetData> = {}): BudgetData {
  return {
    currency: 'JOD',
    periodStartDay: 1,
    theme: 'system',
    categories: [category()],
    expenses: [expense()],
    recurring: [],
    ...overrides,
  };
}
