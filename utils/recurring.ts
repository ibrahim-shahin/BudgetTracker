import type { RecurringExpense } from '@/types';
import { type LocalDate, addDays, addMonths, clampedDate, parseLocalDate } from '@/utils/dates';

// Due dates never drift: a monthly expense starting on 31 January is due on
// 28 February and then 31 March, not 28 March.

/** The n-th due date (0 is the start date). */
export function nthDueDate(rule: Pick<RecurringExpense, 'frequency' | 'startDate'>, n: number): LocalDate {
  const start = parseLocalDate(rule.startDate);
  if (!start) throw new Error(`Not a date: ${rule.startDate}`);
  switch (rule.frequency) {
    case 'weekly':
      return addDays(rule.startDate, 7 * n);
    case 'monthly': {
      const { year, month } = addMonths(start.year, start.month, n);
      return clampedDate(year, month, start.day);
    }
    case 'yearly':
      return clampedDate(start.year + n, start.month, start.day);
  }
}

// Enough for weekly ones started years ago; stops a bad clock from looping.
const MAX_STEPS = 5000;

/** Due dates up to and including `upTo` that haven't been added yet. */
export function dueDates(rule: RecurringExpense, upTo: LocalDate): LocalDate[] {
  if (rule.paused) return [];
  const due: LocalDate[] = [];
  for (let n = 0; n < MAX_STEPS; n++) {
    const date = nthDueDate(rule, n);
    if (date > upTo) break;
    if (rule.lastAdded === null || date > rule.lastAdded) due.push(date);
  }
  return due;
}

/** The first due date after `after`, or null when paused. */
export function nextDueDate(rule: RecurringExpense, after: LocalDate): LocalDate | null {
  if (rule.paused) return null;
  const from = rule.lastAdded !== null && rule.lastAdded > after ? rule.lastAdded : after;
  for (let n = 0; n < MAX_STEPS; n++) {
    const date = nthDueDate(rule, n);
    if (date > from) return date;
  }
  return null;
}

/** The id of the expense a recurring expense adds on a date, so it is never added twice. */
export function recurringExpenseId(ruleId: string, date: LocalDate): string {
  return `${ruleId}-${date}`;
}
