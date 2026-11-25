import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/storage/localStore';
import { useViewStore } from '@/store/viewStore';
import { type BudgetData, type Category, type Expense, LIMITS, type ThemeOption } from '@/types';
import { changeCurrency, withBudgetFrom } from '@/utils/budget';
import { type LocalDate, type PeriodKey, isLocalDate, isPeriodStartDay, periodOf, today } from '@/utils/dates';
import { currencyDecimals, DEFAULT_CURRENCY, isKnownCurrency, isValidMinor } from '@/utils/money';

export interface CategoryInput {
  name: string;
  /** The monthly budget in minor units; 0 for none. */
  budget: number;
  color: string;
  icon: string;
}

export interface ExpenseInput {
  categoryId: string;
  amount: number;
  merchant: string;
  notes: string;
  tags: string[];
  date: LocalDate;
}

interface BudgetState extends BudgetData {
  addCategory: (input: CategoryInput, period: PeriodKey) => string;
  /** Saves the details; a new budget applies from `period` onwards. */
  updateCategory: (id: string, input: CategoryInput, period: PeriodKey) => void;
  /** Deletes the category with its expenses. */
  deleteCategory: (id: string) => void;
  togglePin: (id: string) => void;

  addExpense: (input: ExpenseInput) => string;
  updateExpense: (id: string, input: ExpenseInput) => void;
  /** Deletes the expense and returns it, so it can be put back. */
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;

  setTheme: (theme: ThemeOption) => void;
  /** Switches currency, keeping written amounts; returns how many were rounded. */
  setCurrency: (currency: string) => number;
  setPeriodStartDay: (day: number) => void;

  clearData: () => void;
}

const EMPTY: BudgetData = {
  currency: DEFAULT_CURRENCY,
  periodStartDay: 1,
  theme: 'system',
  categories: [],
  expenses: [],
};

let lastIdTime = 0;

/** A short id that sorts by creation time and is safe in a URL. */
export function newId(): string {
  const now = Math.max(Date.now(), lastIdTime + 1);
  lastIdTime = now;
  return now.toString(36) + Math.random().toString(36).slice(2, 8).padEnd(6, '0');
}

function cleanText(text: string, max: number): string {
  return text.trim().slice(0, max);
}

function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const clean = cleanText(tag, LIMITS.tag);
    const key = clean.toLocaleLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result.slice(0, LIMITS.tags);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => {
      const decimals = () => currencyDecimals(get().currency);

      const checkExpense = (input: ExpenseInput) => {
        assert(get().categories.some(c => c.id === input.categoryId), 'Unknown category');
        assert(isValidMinor(input.amount, decimals()) && input.amount > 0, 'Invalid amount');
        assert(isLocalDate(input.date), 'Invalid date');
        return {
          categoryId: input.categoryId,
          amount: input.amount,
          merchant: cleanText(input.merchant, LIMITS.merchant),
          notes: cleanText(input.notes, LIMITS.notes),
          tags: cleanTags(input.tags),
          date: input.date,
        };
      };

      const checkCategory = (input: CategoryInput) => {
        const name = cleanText(input.name, LIMITS.categoryName);
        assert(name !== '', 'A category needs a name');
        assert(isValidMinor(input.budget, decimals()), 'Invalid budget');
        return { name, color: input.color, icon: input.icon };
      };

      return {
        ...EMPTY,

        addCategory: (input, period) => {
          const details = checkCategory(input);
          const id = newId();
          const category: Category = {
            id,
            ...details,
            budgets: [{ from: period, amount: input.budget }],
            createdAt: new Date().toISOString(),
            pinned: false,
          };
          set(s => ({ categories: [...s.categories, category] }));
          return id;
        },

        updateCategory: (id, input, period) => {
          const details = checkCategory(input);
          set(s => ({
            categories: s.categories.map(c =>
              c.id === id ? { ...c, ...details, budgets: withBudgetFrom(c.budgets, period, input.budget) } : c,
            ),
          }));
        },

        deleteCategory: id => {
          set(s => ({
            categories: s.categories.filter(c => c.id !== id),
            expenses: s.expenses.filter(e => e.categoryId !== id),
          }));
        },

        togglePin: id => {
          set(s => ({ categories: s.categories.map(c => (c.id === id ? { ...c, pinned: !c.pinned } : c)) }));
        },

        addExpense: input => {
          const expense: Expense = { id: newId(), ...checkExpense(input), createdAt: new Date().toISOString() };
          set(s => ({ expenses: [...s.expenses, expense] }));
          return expense.id;
        },

        updateExpense: (id, input) => {
          const changes = checkExpense(input);
          set(s => ({ expenses: s.expenses.map(e => (e.id === id ? { ...e, ...changes } : e)) }));
        },

        deleteExpense: id => {
          const expense = get().expenses.find(e => e.id === id);
          if (expense) set(s => ({ expenses: s.expenses.filter(e => e.id !== id) }));
          return expense;
        },

        restoreExpense: expense => {
          const { categories, expenses } = get();
          if (!categories.some(c => c.id === expense.categoryId) || expenses.some(e => e.id === expense.id)) return;
          set({ expenses: [...expenses, expense] });
        },

        setTheme: theme => set({ theme }),

        setCurrency: currency => {
          assert(isKnownCurrency(currency), 'Unknown currency');
          const { data, inexact } = changeCurrency(get(), currency);
          set({ currency, categories: data.categories, expenses: data.expenses });
          return inexact;
        },

        setPeriodStartDay: day => {
          assert(isPeriodStartDay(day), 'Invalid start day');
          set({ periodStartDay: day });
        },

        clearData: () => set({ categories: [], expenses: [] }),
      };
    },
    {
      name: 'budget-tracker',
      version: 1,
      storage: createJSONStorage(() => localStore),
      // If the saved data can't be read, the app must not carry on with an
      // empty budget: its next save would overwrite what is on the phone.
      onRehydrateStorage: () => (_state, error) => {
        if (error) useViewStore.setState({ loadError: error instanceof Error ? error.message : String(error) });
      },
      partialize: s => ({
        currency: s.currency,
        periodStartDay: s.periodStartDay,
        theme: s.theme,
        categories: s.categories,
        expenses: s.expenses,
      }),
    },
  ),
);

/** The budget month today is in. */
export function currentPeriod(startDay: number, on: LocalDate = today()): PeriodKey {
  return periodOf(on, startDay);
}
