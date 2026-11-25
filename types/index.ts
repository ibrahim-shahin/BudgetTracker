import type { LocalDate, PeriodKey } from '@/utils/dates';

// Amounts are whole numbers of the currency's smallest unit (see utils/money.ts).

/** A category's monthly budget from a budget month onwards. */
export interface BudgetEntry {
  from: PeriodKey;
  amount: number;
}

export interface Category {
  id: string;
  name: string;
  /**
   * The monthly budget and when it changed, oldest first, so past months keep
   * the budget they had. An amount of 0 means the category has no budget.
   */
  budgets: BudgetEntry[];
  color: string;
  icon: string;
  createdAt: string;
  pinned: boolean;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  merchant: string;
  notes: string;
  tags: string[];
  /** The day it was spent, in the phone's time zone. */
  date: LocalDate;
  createdAt: string;
}

export type ThemeOption = 'light' | 'dark' | 'system';

/** Everything a backup holds. */
export interface BudgetData {
  currency: string;
  /** The day of the month budget months start on, 1-31. */
  periodStartDay: number;
  theme: ThemeOption;
  categories: Category[];
  expenses: Expense[];
}

export type SortOption = 'name' | 'remaining' | 'spent' | 'budget' | 'activity';
export type FilterOption = 'all' | 'overspent' | 'under_budget' | 'no_expenses';

export const CATEGORY_COLORS: string[] = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6366F1',
  '#0EA5E9',
  '#64748B',
  '#92400E',
];

export const CATEGORY_ICONS = [
  'shopping-cart',
  'coffee',
  'home',
  'truck',
  'film',
  'heart',
  'book',
  'zap',
  'globe',
  'gift',
  'briefcase',
  'tag',
  'smartphone',
  'wifi',
  'droplet',
  'scissors',
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const LIMITS = {
  categoryName: 40,
  merchant: 60,
  notes: 300,
  tag: 24,
  tags: 8,
  categories: 200,
  expenses: 200_000,
} as const;
