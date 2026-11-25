import { useMemo } from 'react';

import { useBudgetStore } from '@/store/budgetStore';
import { useViewStore } from '@/store/viewStore';
import { categoryMonths, expensesInPeriod, totals } from '@/utils/budget';
import { type PeriodKey, periodOf, today } from '@/utils/dates';

/** The budget month the tabs show, and a way to move between months. */
export function useViewedPeriod() {
  const startDay = useBudgetStore(s => s.periodStartDay);
  const viewed = useViewStore(s => s.period);
  const setViewed = useViewStore(s => s.setPeriod);
  const current = periodOf(today(), startDay);
  const period = viewed ?? current;
  return {
    period,
    current,
    startDay,
    isCurrent: period === current,
    setPeriod: (next: PeriodKey) => setViewed(next === current ? null : next),
  };
}

/** A budget month's expenses and each category's budget and spending in it. */
export function useBudgetMonth(period: PeriodKey) {
  const categories = useBudgetStore(s => s.categories);
  const expenses = useBudgetStore(s => s.expenses);
  const startDay = useBudgetStore(s => s.periodStartDay);
  return useMemo(() => {
    const periodExpenses = expensesInPeriod(expenses, period, startDay);
    const rows = categoryMonths(categories, periodExpenses, period);
    return { periodExpenses, rows, totals: totals(rows) };
  }, [categories, expenses, period, startDay]);
}
