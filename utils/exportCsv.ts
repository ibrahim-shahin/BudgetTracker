import type { Category, Expense } from '@/types';
import { toCsv } from '@/utils/csv';
import { currencyDecimals } from '@/utils/money';

/** The amount without grouping, so spreadsheets read it as a number: "1234.500". */
export function plainAmount(minor: number, decimals: number): string {
  if (decimals === 0) return String(minor);
  const unit = 10 ** decimals;
  return `${Math.floor(minor / unit)}.${String(minor % unit).padStart(decimals, '0')}`;
}

/** Every expense, oldest first, as a CSV file. */
export function expensesCsv(expenses: Expense[], categories: Category[], currency: string): string {
  const decimals = currencyDecimals(currency);
  const names = new Map(categories.map(c => [c.id, c.name]));
  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map(e => [e.date, names.get(e.categoryId) ?? '', plainAmount(e.amount, decimals), currency, e.merchant, e.notes, e.tags.join('; ')]);
  return toCsv([['Date', 'Category', 'Amount', 'Currency', 'Merchant', 'Notes', 'Tags'], ...rows]);
}
