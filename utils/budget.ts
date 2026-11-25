import type { Category, Expense } from '@/types';
import { type PeriodKey, isInPeriod } from '@/utils/dates';
import { currencyDecimals, rescaleMinor } from '@/utils/money';
import { normalizeForSearch } from '@/utils/search';

/** The category's budget in a budget month (its first budget before it was set). */
export function budgetFor(category: Category, period: PeriodKey): number {
  let amount = category.budgets[0]?.amount ?? 0;
  for (const entry of category.budgets) {
    if (entry.from <= period) amount = entry.amount;
    else break;
  }
  return amount;
}

/** The budget history with `amount` applying from `period` onwards. */
export function withBudgetFrom(budgets: Category['budgets'], period: PeriodKey, amount: number): Category['budgets'] {
  const earlier = budgets.filter(entry => entry.from < period);
  if (earlier.length > 0 && earlier[earlier.length - 1].amount === amount) return earlier;
  return [...earlier, { from: period, amount }];
}

export function expensesInPeriod(expenses: Expense[], period: PeriodKey, startDay: number): Expense[] {
  return expenses.filter(e => isInPeriod(e.date, period, startDay));
}

export function sumAmounts(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export interface CategoryMonth {
  category: Category;
  budget: number;
  spent: number;
  remaining: number;
  count: number;
  lastDate: string | null;
}

/** Each category's budget and spending in a budget month. */
export function categoryMonths(categories: Category[], periodExpenses: Expense[], period: PeriodKey): CategoryMonth[] {
  const byId = new Map<string, CategoryMonth>();
  for (const category of categories) {
    const budget = budgetFor(category, period);
    byId.set(category.id, { category, budget, spent: 0, remaining: budget, count: 0, lastDate: null });
  }
  for (const expense of periodExpenses) {
    const row = byId.get(expense.categoryId);
    if (!row) continue;
    row.spent += expense.amount;
    row.remaining = row.budget - row.spent;
    row.count += 1;
    if (row.lastDate === null || expense.date > row.lastDate) row.lastDate = expense.date;
  }
  return categories.map(c => byId.get(c.id)!);
}

export function totals(rows: CategoryMonth[]): { budget: number; spent: number; remaining: number; overspent: number } {
  let budget = 0;
  let spent = 0;
  let overspent = 0;
  for (const row of rows) {
    budget += row.budget;
    spent += row.spent;
    if (row.budget > 0 && row.spent > row.budget) overspent += 1;
  }
  return { budget, spent, remaining: budget - spent, overspent };
}

/** Spending per merchant, biggest first, with differently typed names merged. */
export function merchantTotals(expenses: Expense[]): { name: string; total: number; count: number }[] {
  const byKey = new Map<string, { name: string; total: number; count: number; latest: string }>();
  for (const e of expenses) {
    const name = e.merchant.trim();
    if (!name) continue;
    const key = normalizeForSearch(name);
    const row = byKey.get(key);
    if (!row) {
      byKey.set(key, { name, total: e.amount, count: 1, latest: e.date });
    } else {
      row.total += e.amount;
      row.count += 1;
      if (e.date >= row.latest) {
        row.latest = e.date;
        row.name = name;
      }
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map(({ name, total, count }) => ({ name, total, count }));
}

/**
 * The same data in another currency. Amounts keep their written value (no
 * exchange rate); going to fewer decimals rounds, and `inexact` counts the
 * amounts that changed because of it.
 */
export function changeCurrency<T extends { currency: string; categories: Category[]; expenses: Expense[] }>(
  data: T,
  currency: string,
): { data: T; inexact: number } {
  const from = currencyDecimals(data.currency);
  const to = currencyDecimals(currency);
  let inexact = 0;
  const convert = (minor: number) => {
    const result = rescaleMinor(minor, from, to);
    if (!result.exact) inexact += 1;
    return result.minor;
  };
  // An amount that rounds to zero would no longer be a valid expense.
  const positive = (minor: number) => Math.max(convert(minor), 1);
  return {
    data: {
      ...data,
      currency,
      categories: data.categories.map(c => ({ ...c, budgets: c.budgets.map(b => ({ ...b, amount: convert(b.amount) })) })),
      expenses: data.expenses.map(e => ({ ...e, amount: positive(e.amount) })),
    },
    inexact,
  };
}
