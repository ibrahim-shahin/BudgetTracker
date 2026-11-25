import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/storage/localStore';

import type { Category, Expense, HistoryEvent, EventType, ThemeOption } from '@/types';

const genId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

function makeEvent(
  categoryId: string,
  type: EventType,
  description: string,
  opts?: {
    amount?: number;
    previousValue?: number;
    newValue?: number;
    relatedId?: string;
  }
): HistoryEvent {
  return {
    id: genId(),
    categoryId,
    type,
    description,
    amount: opts?.amount,
    previousValue: opts?.previousValue,
    newValue: opts?.newValue,
    relatedId: opts?.relatedId,
    createdAt: new Date().toISOString(),
  };
}

/** The category's expenses in its current cycle (since its last reset). */
export function getCycleExpenses(category: Category, expenses: Expense[]): Expense[] {
  const own = expenses.filter(e => e.categoryId === category.id);
  if (!category.lastResetAt) return own;
  const resetTime = new Date(category.lastResetAt).getTime();
  return own.filter(e => new Date(e.date).getTime() >= resetTime);
}

/** What each category has spent in its current cycle, by category id. */
export function getSpentByCategory(categories: Category[], expenses: Expense[]): Map<string, number> {
  const spent = new Map<string, number>();
  for (const category of categories) {
    spent.set(category.id, getCycleExpenses(category, expenses).reduce((sum, e) => sum + e.amount, 0));
  }
  return spent;
}

/** The date of the category's latest expense, or null. */
export function getLastExpenseDateFor(categoryId: string, expenses: Expense[]): string | null {
  let latest: string | null = null;
  for (const e of expenses) {
    if (e.categoryId !== categoryId) continue;
    if (latest === null || new Date(e.date).getTime() > new Date(latest).getTime()) latest = e.date;
  }
  return latest;
}

interface BudgetState {
  categories: Category[];
  expenses: Expense[];
  events: HistoryEvent[];
  theme: ThemeOption;
  currency: string;

  addCategory: (name: string, budget: number, color: string, icon: string) => void;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'budget' | 'color' | 'icon'>>) => void;
  deleteCategory: (id: string) => void;
  togglePin: (id: string) => void;

  addExpense: (data: {
    categoryId: string;
    amount: number;
    merchant: string;
    notes: string;
    tags: string[];
    date: string;
  }) => void;
  updateExpense: (id: string, updates: Partial<Pick<Expense, 'amount' | 'merchant' | 'notes' | 'tags' | 'date'>>) => void;
  deleteExpense: (id: string) => void;

  resetCategory: (id: string, keepBudget: boolean) => void;
  resetAll: (keepBudgets: boolean) => void;

  setTheme: (theme: ThemeOption) => void;
  setCurrency: (currency: string) => void;

  exportData: () => string;
  importData: (json: string) => boolean;

  getCategoryExpenses: (categoryId: string) => Expense[];
  getCategoryTotal: (categoryId: string) => number;
  getCategoryEvents: (categoryId: string) => HistoryEvent[];
  getLastExpenseDate: (categoryId: string) => string | null;
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      categories: [],
      expenses: [],
      events: [],
      theme: 'system',
      currency: 'JOD',

      addCategory: (name, budget, color, icon) => {
        const id = genId();
        const cat: Category = {
          id, name, budget, color, icon,
          createdAt: new Date().toISOString(),
          lastResetAt: null,
          pinned: false,
        };
        set(s => ({
          categories: [...s.categories, cat],
          events: [...s.events, makeEvent(id, 'category_created', `"${name}" created with budget ${budget}`, { amount: budget })],
        }));
      },

      updateCategory: (id, updates) => {
        const prev = get().categories.find(c => c.id === id);
        if (!prev) return;
        set(s => {
          const evts = [...s.events];
          if (updates.budget !== undefined && updates.budget !== prev.budget) {
            evts.push(makeEvent(id, 'budget_changed', `Budget changed from ${prev.budget} to ${updates.budget}`, {
              previousValue: prev.budget,
              newValue: updates.budget,
            }));
          } else {
            evts.push(makeEvent(id, 'category_updated', 'Category details updated'));
          }
          return {
            categories: s.categories.map(c => c.id === id ? { ...c, ...updates } : c),
            events: evts,
          };
        });
      },

      deleteCategory: (id) => {
        set(s => ({
          categories: s.categories.filter(c => c.id !== id),
          expenses: s.expenses.filter(e => e.categoryId !== id),
          events: s.events.filter(e => e.categoryId !== id),
        }));
      },

      togglePin: (id) => {
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c),
        }));
      },

      addExpense: ({ categoryId, amount, merchant, notes, tags, date }) => {
        const id = genId();
        const expense: Expense = {
          id, categoryId, amount, merchant, notes, tags, date,
          createdAt: new Date().toISOString(),
        };
        const desc = merchant ? `${amount} spent at ${merchant}` : `Expense of ${amount}`;
        set(s => ({
          expenses: [...s.expenses, expense],
          events: [...s.events, makeEvent(categoryId, 'expense_added', desc, { amount, relatedId: id })],
        }));
      },

      updateExpense: (id, updates) => {
        const prev = get().expenses.find(e => e.id === id);
        if (!prev) return;
        set(s => ({
          expenses: s.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
          events: [...s.events, makeEvent(prev.categoryId, 'expense_edited', 'Expense edited', {
            amount: updates.amount,
            previousValue: prev.amount,
            newValue: updates.amount,
            relatedId: id,
          })],
        }));
      },

      deleteExpense: (id) => {
        const expense = get().expenses.find(e => e.id === id);
        if (!expense) return;
        set(s => ({
          expenses: s.expenses.filter(e => e.id !== id),
          events: [...s.events, makeEvent(expense.categoryId, 'expense_deleted', `Expense of ${expense.amount} deleted`, {
            amount: expense.amount,
            relatedId: id,
          })],
        }));
      },

      resetCategory: (id, keepBudget) => {
        const cat = get().categories.find(c => c.id === id);
        if (!cat) return;
        const now = new Date().toISOString();
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, lastResetAt: now } : c),
          events: [...s.events, makeEvent(id, 'category_reset', `"${cat.name}" reset — new cycle started`)],
        }));
      },

      resetAll: (keepBudgets) => {
        const now = new Date().toISOString();
        const cats = get().categories;
        const newEvents: HistoryEvent[] = cats.map(cat =>
          makeEvent(cat.id, 'all_reset', 'All categories reset — new cycle started')
        );
        set(s => ({
          categories: s.categories.map(c => ({ ...c, lastResetAt: now })),
          events: [...s.events, ...newEvents],
        }));
      },

      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),

      exportData: () => {
        const { categories, expenses, events, currency } = get();
        return JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          categories,
          expenses,
          events,
          settings: { currency },
        }, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json) as {
            categories?: Category[];
            expenses?: Expense[];
            events?: HistoryEvent[];
            settings?: { currency?: string };
          };
          if (!data.categories || !Array.isArray(data.categories)) return false;
          set({
            categories: data.categories ?? [],
            expenses: data.expenses ?? [],
            events: data.events ?? [],
            currency: data.settings?.currency ?? 'JOD',
          });
          return true;
        } catch {
          return false;
        }
      },

      getCategoryExpenses: (categoryId) => {
        const { categories, expenses } = get();
        const cat = categories.find(c => c.id === categoryId);
        return cat ? getCycleExpenses(cat, expenses) : [];
      },

      getCategoryTotal: (categoryId) => {
        const expenses = get().getCategoryExpenses(categoryId);
        return expenses.reduce((sum, e) => sum + e.amount, 0);
      },

      getCategoryEvents: (categoryId) => {
        return [...get().events.filter(e => e.categoryId === categoryId)]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getLastExpenseDate: (categoryId) => getLastExpenseDateFor(categoryId, get().expenses),
    }),
    {
      name: 'budget-storage-v1',
      storage: createJSONStorage(() => localStore),
    }
  )
);
