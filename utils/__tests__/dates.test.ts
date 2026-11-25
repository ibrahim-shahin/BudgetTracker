import {
  addDays,
  addMonths,
  clampedDate,
  daysBetween,
  daysInMonth,
  formatDayLabel,
  formatPeriodLabel,
  isInPeriod,
  isLocalDate,
  isPeriodKey,
  localDateToDate,
  parseLocalDate,
  periodOf,
  periodProgress,
  periodRange,
  shiftPeriod,
  today,
} from '../dates';

describe('calendar dates', () => {
  it('accepts only real dates', () => {
    expect(isLocalDate('2026-11-25')).toBe(true);
    expect(isLocalDate('2028-02-29')).toBe(true);
    for (const bad of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-11-31', 'not-a-date', '2026-1-5', '', null, 20261125]) {
      expect(isLocalDate(bad)).toBe(false);
    }
  });

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("takes today from the phone's clock, not UTC (regression for the hours after midnight)", () => {
    // 01:30 local on 26 Nov is still 25 Nov in UTC east of Greenwich.
    expect(today(new Date(2026, 10, 26, 1, 30))).toBe('2026-11-26');
    expect(today(new Date(2026, 10, 25, 23, 59))).toBe('2026-11-25');
  });

  it('turns a date into local midnight (regression: dates showed a day early west of UTC)', () => {
    const d = localDateToDate('2026-11-25');
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 11, 25, 0]);
  });

  it('adds days across months, years and daylight-saving changes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-27', 7)).toBe('2026-04-03');
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(daysBetween('2026-11-25', '2026-11-20')).toBe(-5);
  });

  it('clamps days to the end of shorter months', () => {
    expect(clampedDate(2026, 2, 31)).toBe('2026-02-28');
    expect(clampedDate(2028, 2, 30)).toBe('2028-02-29');
    expect(clampedDate(2026, 4, 31)).toBe('2026-04-30');
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths(2026, 5, -17)).toEqual({ year: 2024, month: 12 });
  });

  it('rejects malformed text when parsing', () => {
    expect(parseLocalDate('2026-11-25T10:00:00Z')).toBeNull();
    expect(() => addDays('nope', 1)).toThrow();
  });
});

describe('budget months', () => {
  it('runs calendar months when they start on the 1st', () => {
    expect(periodRange('2026-11', 1)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(periodRange('2026-02', 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(periodOf('2026-11-01', 1)).toBe('2026-11');
    expect(periodOf('2026-11-30', 1)).toBe('2026-11');
    expect(periodOf('2026-12-01', 1)).toBe('2026-12');
  });

  it('starts on payday and ends the day before the next one', () => {
    expect(periodRange('2026-11', 25)).toEqual({ start: '2026-11-25', end: '2026-12-24' });
    expect(periodOf('2026-11-24', 25)).toBe('2026-10');
    expect(periodOf('2026-11-25', 25)).toBe('2026-11');
    expect(periodOf('2027-01-10', 25)).toBe('2026-12');
  });

  it('starts on the last day of months without the start day', () => {
    expect(periodRange('2026-01', 31)).toEqual({ start: '2026-01-31', end: '2026-02-27' });
    expect(periodRange('2026-02', 31)).toEqual({ start: '2026-02-28', end: '2026-03-30' });
    expect(periodRange('2028-02', 30)).toEqual({ start: '2028-02-29', end: '2028-03-29' });
    expect(periodOf('2026-02-27', 31)).toBe('2026-01');
    expect(periodOf('2026-02-28', 31)).toBe('2026-02');
    expect(periodOf('2026-03-30', 31)).toBe('2026-02');
    expect(periodOf('2026-03-31', 31)).toBe('2026-03');
  });

  it('covers every day exactly once', () => {
    for (const startDay of [1, 15, 28, 29, 30, 31]) {
      let key = periodOf('2025-12-15', startDay);
      let expected = periodRange(key, startDay).start;
      for (let i = 0; i < 30; i++) {
        const { start, end } = periodRange(key, startDay);
        expect(start).toBe(expected);
        expect(end >= start).toBe(true);
        expect(periodOf(start, startDay)).toBe(key);
        expect(periodOf(end, startDay)).toBe(key);
        expected = addDays(end, 1);
        key = shiftPeriod(key, 1);
      }
    }
  });

  it('moves between months and checks membership', () => {
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(isInPeriod('2026-12-24', '2026-11', 25)).toBe(true);
    expect(isInPeriod('2026-12-25', '2026-11', 25)).toBe(false);
    expect(isPeriodKey('2026-11')).toBe(true);
    expect(isPeriodKey('2026-13')).toBe(false);
  });

  it('counts the days of a budget month that have passed', () => {
    expect(periodProgress('2026-11', 1, '2026-11-10')).toEqual({ days: 30, elapsed: 10 });
    expect(periodProgress('2026-11', 1, '2026-10-31')).toEqual({ days: 30, elapsed: 0 });
    expect(periodProgress('2026-11', 1, '2026-12-05')).toEqual({ days: 30, elapsed: 30 });
  });
});

describe('labels', () => {
  it('names nearby days and shows the year only when it differs', () => {
    expect(formatDayLabel('2026-11-25', '2026-11-25')).toBe('Today');
    expect(formatDayLabel('2026-11-24', '2026-11-25')).toBe('Yesterday');
    expect(formatDayLabel('2026-11-20', '2026-11-25')).toBe('Fri 20 Nov');
    expect(formatDayLabel('2025-12-31', '2026-01-02')).toBe('Wed 31 Dec 2025');
  });

  it('names budget months', () => {
    expect(formatPeriodLabel('2026-11', 1)).toBe('November 2026');
    expect(formatPeriodLabel('2026-11', 25)).toBe('25 Nov – 24 Dec 2026');
    expect(formatPeriodLabel('2026-12', 25)).toBe('25 Dec 2026 – 24 Jan 2027');
  });
});
