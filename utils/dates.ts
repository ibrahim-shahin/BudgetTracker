import { format } from 'date-fns';

// Expense dates are calendar days in the phone's time zone, kept as
// "YYYY-MM-DD" text. They are never turned into UTC instants, so an expense
// stays on the day it was entered wherever the phone is.

export type LocalDate = string;

/** A budget month, named by the month it starts in: "2026-11". */
export type PeriodKey = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const PERIOD_PATTERN = /^(\d{4})-(\d{2})$/;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toLocalDate(year: number, month: number, day: number): LocalDate {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

/** The parts of a real calendar date, or null ("2026-02-30" is null). */
export function parseLocalDate(text: unknown): { year: number; month: number; day: number } | null {
  if (typeof text !== 'string') return null;
  const match = DATE_PATTERN.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1970 || year > 9999 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

export function isLocalDate(text: unknown): text is LocalDate {
  return parseLocalDate(text) !== null;
}

/** Today in the phone's time zone (not UTC, which can be a day off). */
export function today(now: Date = new Date()): LocalDate {
  return toLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Midnight at the start of the day, in the phone's time zone, for display. */
export function localDateToDate(date: LocalDate): Date {
  const parts = parseLocalDate(date);
  if (!parts) return new Date(Number.NaN);
  return new Date(parts.year, parts.month - 1, parts.day);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const parts = parseLocalDate(date);
  if (!parts) throw new Error(`Not a date: ${date}`);
  // UTC arithmetic has no daylight-saving jumps.
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return toLocalDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  if (!a || !b) throw new Error(`Not a date: ${from} / ${to}`);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** The day `day` of a month, or the month's last day when it is shorter. */
export function clampedDate(year: number, month: number, day: number): LocalDate {
  return toLocalDate(year, month, Math.min(day, daysInMonth(year, month)));
}

export function addMonths(year: number, month: number, months: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + months;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// Budget months -------------------------------------------------------------
//
// A budget month starts on `startDay` (1-31) and runs to the day before the
// next one starts. In months without that day it starts on the last day:
// with startDay 31, February's starts on the 28th (29th in leap years).

export function isPeriodStartDay(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31;
}

export function isPeriodKey(text: unknown): text is PeriodKey {
  if (typeof text !== 'string') return false;
  const match = PERIOD_PATTERN.exec(text);
  return match !== null && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

function parsePeriodKey(key: PeriodKey): { year: number; month: number } {
  const match = PERIOD_PATTERN.exec(key);
  if (!match) throw new Error(`Not a budget month: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function periodKey(year: number, month: number): PeriodKey {
  return `${pad(year, 4)}-${pad(month)}`;
}

/** The first and last day of a budget month. */
export function periodRange(key: PeriodKey, startDay: number): { start: LocalDate; end: LocalDate } {
  const { year, month } = parsePeriodKey(key);
  const next = addMonths(year, month, 1);
  return {
    start: clampedDate(year, month, startDay),
    end: addDays(clampedDate(next.year, next.month, startDay), -1),
  };
}

/** The budget month a day belongs to. */
export function periodOf(date: LocalDate, startDay: number): PeriodKey {
  const parts = parseLocalDate(date);
  if (!parts) throw new Error(`Not a date: ${date}`);
  if (date >= clampedDate(parts.year, parts.month, startDay)) return periodKey(parts.year, parts.month);
  const previous = addMonths(parts.year, parts.month, -1);
  return periodKey(previous.year, previous.month);
}

export function shiftPeriod(key: PeriodKey, months: number): PeriodKey {
  const { year, month } = parsePeriodKey(key);
  const next = addMonths(year, month, months);
  return periodKey(next.year, next.month);
}

/** True when the day falls inside the budget month. */
export function isInPeriod(date: LocalDate, key: PeriodKey, startDay: number): boolean {
  const { start, end } = periodRange(key, startDay);
  return date >= start && date <= end;
}

/** Days in the budget month, and how many of them have passed by `on`. */
export function periodProgress(key: PeriodKey, startDay: number, on: LocalDate): { days: number; elapsed: number } {
  const { start, end } = periodRange(key, startDay);
  const days = daysBetween(start, end) + 1;
  if (on < start) return { days, elapsed: 0 };
  if (on > end) return { days, elapsed: days };
  return { days, elapsed: daysBetween(start, on) + 1 };
}

// Labels --------------------------------------------------------------------

/** "Today", "Yesterday", "Mon 23 Nov", or "Mon 23 Nov 2025" in another year. */
export function formatDayLabel(date: LocalDate, on: LocalDate = today()): string {
  if (date === on) return 'Today';
  if (date === addDays(on, -1)) return 'Yesterday';
  const sameYear = date.slice(0, 4) === on.slice(0, 4);
  return format(localDateToDate(date), sameYear ? 'EEE d MMM' : 'EEE d MMM yyyy');
}

/** "November 2026" for months starting on the 1st, else "25 Nov – 24 Dec 2026". */
export function formatPeriodLabel(key: PeriodKey, startDay: number): string {
  const { start, end } = periodRange(key, startDay);
  if (start.endsWith('-01') && start.slice(0, 7) === end.slice(0, 7)) {
    return format(localDateToDate(start), 'MMMM yyyy');
  }
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const from = format(localDateToDate(start), sameYear ? 'd MMM' : 'd MMM yyyy');
  return `${from} – ${format(localDateToDate(end), 'd MMM yyyy')}`;
}

/** "Nov" or "Nov 25" style short label for charts. */
export function formatPeriodShort(key: PeriodKey): string {
  const { year, month } = parsePeriodKey(key);
  return format(new Date(year, month - 1, 1), 'MMM');
}
