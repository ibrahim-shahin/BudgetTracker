export interface Category {
  id: string;
  name: string;
  budget: number;
  color: string;
  icon: string;
  createdAt: string;
  lastResetAt: string | null;
  pinned: boolean;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  merchant: string;
  notes: string;
  tags: string[];
  date: string;
  createdAt: string;
}

export type EventType =
  | 'category_created'
  | 'category_updated'
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'budget_changed'
  | 'category_reset'
  | 'all_reset';

export interface HistoryEvent {
  id: string;
  categoryId: string;
  type: EventType;
  amount?: number;
  previousValue?: number;
  newValue?: number;
  description: string;
  relatedId?: string;
  createdAt: string;
}

export type SortOption = 'name' | 'remaining' | 'spent' | 'budget' | 'activity' | 'overspent';
export type FilterOption = 'all' | 'overspent' | 'under_budget' | 'no_expenses';
export type ThemeOption = 'light' | 'dark' | 'system';

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

export const CATEGORY_ICONS: string[] = [
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
];

export const CURRENCY_OPTIONS: string[] = [
  'JOD', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'EGP', 'KWD', 'QAR', 'BHD',
];
