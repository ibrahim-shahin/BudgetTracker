import { dueDates, nextDueDate, nthDueDate, recurringExpenseId } from '../recurring';
import { recurring } from '@/test-utils/data';

describe('nthDueDate', () => {
  it('keeps monthly dates on their day, using the last day of shorter months', () => {
    const rent = recurring({ frequency: 'monthly', startDate: '2026-01-31' });
    expect([0, 1, 2, 3, 4].map(n => nthDueDate(rent, n))).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('repeats weekly across months and years', () => {
    const gym = recurring({ frequency: 'weekly', startDate: '2026-12-24' });
    expect([0, 1, 2].map(n => nthDueDate(gym, n))).toEqual(['2026-12-24', '2026-12-31', '2027-01-07']);
  });

  it('moves 29 February to the 28th in other years', () => {
    const plan = recurring({ frequency: 'yearly', startDate: '2028-02-29' });
    expect([0, 1, 4].map(n => nthDueDate(plan, n))).toEqual(['2028-02-29', '2029-02-28', '2032-02-29']);
  });
});

describe('dueDates', () => {
  it('catches up on every date since the start, today included', () => {
    const rent = recurring({ startDate: '2026-09-25', lastAdded: null });
    expect(dueDates(rent, '2026-11-25')).toEqual(['2026-09-25', '2026-10-25', '2026-11-25']);
  });

  it('skips dates already added and dates still to come', () => {
    const rent = recurring({ startDate: '2026-09-25', lastAdded: '2026-10-25' });
    expect(dueDates(rent, '2026-11-24')).toEqual([]);
    expect(dueDates(rent, '2026-11-25')).toEqual(['2026-11-25']);
  });

  it('adds nothing while paused or before the start', () => {
    expect(dueDates(recurring({ paused: true, startDate: '2026-01-01' }), '2026-11-25')).toEqual([]);
    expect(dueDates(recurring({ startDate: '2026-12-01' }), '2026-11-25')).toEqual([]);
  });
});

describe('nextDueDate', () => {
  it('gives the next date after today or after the last one added', () => {
    expect(nextDueDate(recurring({ startDate: '2026-01-31' }), '2026-11-25')).toBe('2026-11-30');
    expect(nextDueDate(recurring({ startDate: '2026-01-31', lastAdded: '2026-11-30' }), '2026-11-25')).toBe('2026-12-31');
    expect(nextDueDate(recurring({ paused: true }), '2026-11-25')).toBeNull();
  });
});

it('names the added expense after the rule and the date', () => {
  expect(recurringExpenseId('rent', '2026-11-30')).toBe('rent-2026-11-30');
});
