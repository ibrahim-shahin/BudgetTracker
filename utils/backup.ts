// Backups are JSON files the user saves or shares. Anything read back is
// treated as untrusted: it is checked field by field and either accepted
// whole or refused with a message, so a damaged or hand-edited file can't
// put the app into a state it can't show.

import {
  type BudgetData,
  type Category,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  type Expense,
  type Frequency,
  LIMITS,
  type RecurringExpense,
  type ThemeOption,
} from '@/types';
import { isLocalDate, isPeriodKey, isPeriodStartDay, periodOf, today } from '@/utils/dates';
import { currencyDecimals, DEFAULT_CURRENCY, isKnownCurrency, isValidMinor, minorFromDecimal } from '@/utils/money';

export const BACKUP_APP = 'budget-tracker';
export const BACKUP_VERSION = 2;
/** Backups bigger than this are refused before parsing. */
export const MAX_BACKUP_CHARS = 30_000_000;

export interface BackupFile extends BudgetData {
  app: typeof BACKUP_APP;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
}

export function createBackup(data: BudgetData, now: Date = new Date()): BackupFile {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    currency: data.currency,
    periodStartDay: data.periodStartDay,
    theme: data.theme,
    categories: data.categories,
    expenses: data.expenses,
    recurring: data.recurring,
  };
}

export type ReadResult = { ok: true; data: BudgetData; legacy: boolean } | { ok: false; error: string };

class BackupError extends Error {}

function fail(message: string): never {
  throw new BackupError(message);
}

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const THEMES: ThemeOption[] = ['light', 'dark', 'system'];
const FREQUENCIES: Frequency[] = ['weekly', 'monthly', 'yearly'];

function readId(value: unknown, what: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) fail(`${what} has a missing or unusual id.`);
  return value;
}

function readText(value: unknown, max: number, what: string, required = false): string {
  if (value === undefined || value === null) {
    if (required) fail(`${what} is missing.`);
    return '';
  }
  if (typeof value !== 'string') fail(`${what} is not text.`);
  const text = value.trim();
  if (required && text === '') fail(`${what} is empty.`);
  if (text.length > max) fail(`${what} is longer than ${max} characters.`);
  return text;
}

function readTags(value: unknown, what: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > LIMITS.tags) fail(`${what} has too many tags or they are not a list.`);
  return value.map((tag, i) => readText(tag, LIMITS.tag, `${what}, tag ${i + 1},`, true));
}

function readTimestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
}

function readAmount(value: unknown, decimals: number, what: string, allowZero: boolean): number {
  if (!isValidMinor(value, decimals) || (!allowZero && value === 0)) fail(`${what} has an amount that isn't valid.`);
  return value;
}

function readDate(value: unknown, what: string): string {
  if (!isLocalDate(value)) fail(`${what} has a date that isn't valid.`);
  return value;
}

function uniqueIds<T extends { id: string }>(items: T[], what: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`Two ${what} share the id "${item.id}".`);
    seen.add(item.id);
  }
}

function readList(value: unknown, max: number, what: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`The ${what} are not a list.`);
  if (value.length > max) fail(`The backup has more than ${max} ${what}.`);
  return value;
}

function readCategory(raw: unknown, i: number, decimals: number): Category {
  const what = `Category ${i + 1}`;
  if (!isObject(raw)) fail(`${what} isn't valid.`);
  if (!Array.isArray(raw.budgets) || raw.budgets.length === 0 || raw.budgets.length > 600) fail(`${what} has no budget.`);
  let previous = '';
  const budgets = raw.budgets.map(entry => {
    if (!isObject(entry) || !isPeriodKey(entry.from) || entry.from <= previous) fail(`${what} has a budget history that isn't valid.`);
    previous = entry.from;
    return { from: entry.from, amount: readAmount(entry.amount, decimals, what, true) };
  });
  return {
    id: readId(raw.id, what),
    name: readText(raw.name, LIMITS.categoryName, `${what}'s name`, true),
    budgets,
    color: typeof raw.color === 'string' && COLOR_PATTERN.test(raw.color) ? raw.color.toUpperCase() : CATEGORY_COLORS[5],
    icon: (CATEGORY_ICONS as readonly string[]).includes(raw.icon as string) ? (raw.icon as string) : 'tag',
    createdAt: readTimestamp(raw.createdAt),
    pinned: raw.pinned === true,
  };
}

function readExpense(raw: unknown, i: number, decimals: number, categoryIds: Set<string>): Expense {
  const what = `Expense ${i + 1}`;
  if (!isObject(raw)) fail(`${what} isn't valid.`);
  const categoryId = readId(raw.categoryId, `${what}'s category`);
  if (!categoryIds.has(categoryId)) fail(`${what} belongs to a category that isn't in the backup.`);
  const expense: Expense = {
    id: readId(raw.id, what),
    categoryId,
    amount: readAmount(raw.amount, decimals, what, false),
    merchant: readText(raw.merchant, LIMITS.merchant, `${what}'s merchant`),
    notes: readText(raw.notes, LIMITS.notes, `${what}'s notes`),
    tags: readTags(raw.tags, what),
    date: readDate(raw.date, what),
    createdAt: readTimestamp(raw.createdAt),
  };
  if (raw.recurringId !== undefined) expense.recurringId = readId(raw.recurringId, `${what}'s repeat`);
  return expense;
}

function readRecurring(raw: unknown, i: number, decimals: number, categoryIds: Set<string>): RecurringExpense {
  const what = `Recurring expense ${i + 1}`;
  if (!isObject(raw)) fail(`${what} isn't valid.`);
  const categoryId = readId(raw.categoryId, `${what}'s category`);
  if (!categoryIds.has(categoryId)) fail(`${what} belongs to a category that isn't in the backup.`);
  if (!FREQUENCIES.includes(raw.frequency as Frequency)) fail(`${what} has a repeat that isn't valid.`);
  const lastAdded = raw.lastAdded === null || raw.lastAdded === undefined ? null : readDate(raw.lastAdded, what);
  return {
    id: readId(raw.id, what),
    categoryId,
    amount: readAmount(raw.amount, decimals, what, false),
    merchant: readText(raw.merchant, LIMITS.merchant, `${what}'s merchant`),
    notes: readText(raw.notes, LIMITS.notes, `${what}'s notes`),
    tags: readTags(raw.tags, what),
    frequency: raw.frequency as Frequency,
    startDate: readDate(raw.startDate, what),
    lastAdded,
    paused: raw.paused === true,
    createdAt: readTimestamp(raw.createdAt),
  };
}

function readCurrentBackup(raw: Obj): BudgetData {
  if (!isKnownCurrency(raw.currency)) fail('The backup uses a currency the app does not know.');
  const decimals = currencyDecimals(raw.currency);
  const categories = readList(raw.categories, LIMITS.categories, 'categories').map((c, i) => readCategory(c, i, decimals));
  uniqueIds(categories, 'categories');
  const categoryIds = new Set(categories.map(c => c.id));
  const expenses = readList(raw.expenses, LIMITS.expenses, 'expenses').map((e, i) => readExpense(e, i, decimals, categoryIds));
  uniqueIds(expenses, 'expenses');
  const recurring = readList(raw.recurring, LIMITS.recurring, 'recurring expenses').map((r, i) =>
    readRecurring(r, i, decimals, categoryIds),
  );
  uniqueIds(recurring, 'recurring expenses');
  return {
    currency: raw.currency,
    periodStartDay: isPeriodStartDay(raw.periodStartDay) ? raw.periodStartDay : 1,
    theme: THEMES.includes(raw.theme as ThemeOption) ? (raw.theme as ThemeOption) : 'system',
    categories,
    expenses,
    recurring,
  };
}

/** The local day of an ISO timestamp, or null. */
function dayOf(timestamp: unknown): string | null {
  if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))) return null;
  return today(new Date(timestamp));
}

/**
 * Reads an export from the first version of the app, which kept amounts as
 * decimal numbers and had manual "reset cycle" events instead of months.
 * The events are dropped; everything else carries over.
 */
function readLegacyExport(raw: Obj): BudgetData {
  const settings = isObject(raw.settings) ? raw.settings : {};
  const currency = isKnownCurrency(settings.currency) ? settings.currency : DEFAULT_CURRENCY;
  const decimals = currencyDecimals(currency);
  const thisMonth = periodOf(today(), 1);

  const categories = readList(raw.categories, LIMITS.categories, 'categories').map((c, i) => {
    if (!isObject(c)) fail(`Category ${i + 1} isn't valid.`);
    const budget = typeof c.budget === 'number' ? minorFromDecimal(c.budget, decimals) : null;
    if (budget === null) fail(`Category ${i + 1} has a budget that isn't valid.`);
    const created = dayOf(c.createdAt);
    return readCategory({ ...c, budgets: [{ from: created ? periodOf(created, 1) : thisMonth, amount: budget }] }, i, decimals);
  });
  uniqueIds(categories, 'categories');
  const categoryIds = new Set(categories.map(c => c.id));

  const expenses = readList(raw.expenses, LIMITS.expenses, 'expenses').map((e, i) => {
    if (!isObject(e)) fail(`Expense ${i + 1} isn't valid.`);
    const amount = typeof e.amount === 'number' ? minorFromDecimal(e.amount, decimals) : null;
    if (amount === null || amount === 0) fail(`Expense ${i + 1} has an amount that isn't valid.`);
    // The first version let any text through as a date; fall back to the day it was entered.
    const date = isLocalDate(e.date) ? e.date : dayOf(e.createdAt);
    return readExpense({ ...e, amount, date }, i, decimals, categoryIds);
  });
  uniqueIds(expenses, 'expenses');

  return { currency, periodStartDay: 1, theme: 'system', categories, expenses, recurring: [] };
}

/** Reads a backup file's text, or explains why it can't be used. */
export function readBackup(text: string): ReadResult {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: 'This file is too large to be a backup.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This isn't a Budget Tracker backup: it isn't valid JSON." };
  }
  try {
    if (isObject(raw) && raw.app === BACKUP_APP) {
      if (raw.version !== BACKUP_VERSION) return { ok: false, error: 'This backup is from a newer version of the app.' };
      return { ok: true, data: readCurrentBackup(raw), legacy: false };
    }
    if (isObject(raw) && raw.version === 1 && Array.isArray(raw.categories)) {
      return { ok: true, data: readLegacyExport(raw), legacy: true };
    }
    return { ok: false, error: "This isn't a Budget Tracker backup." };
  } catch (error) {
    if (error instanceof BackupError) return { ok: false, error: error.message };
    throw error;
  }
}
