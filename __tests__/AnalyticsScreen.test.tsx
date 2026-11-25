import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import AnalyticsScreen from '@/app/(tabs)/analytics';
import { useBudgetStore } from '@/store/budgetStore';
import { useViewStore } from '@/store/viewStore';
import { category, expense } from '@/test-utils/data';
import { LAST_MONTH, LAST_MONTH_DAY, TODAY } from '@/test-utils/dates';
import { setBudgetData } from '@/test-utils/store';

const food = category({ id: 'food', name: 'Food', budgets: [{ from: LAST_MONTH, amount: 50000 }] });
const gifts = category({ id: 'gifts', name: 'Gifts', budgets: [{ from: LAST_MONTH, amount: 0 }] });
const text = (id: string) => within(screen.getByTestId(id)).getAllByText(/./).map(n => n.props.children).join(' ');

beforeEach(() => useViewStore.setState({ period: null }));

it('updates the overview when an expense is added (regression: it kept the old totals)', async () => {
  setBudgetData({ categories: [food] });
  await render(<AnalyticsScreen />);
  await act(async () => {
    useBudgetStore.getState().addExpense({ categoryId: 'food', amount: 60000, merchant: 'Market', notes: '', tags: [], date: TODAY });
  });
  expect(text('overview-spent')).toBe('JOD 60.000 Spent');
  expect(text('overview-overspent')).toBe('CATEGORIES 1 Over budget');
  expect(screen.getByText('JOD 10.000 over JOD 50.000')).toBeTruthy();
});

it('ranks merchants and shows categories without a budget', async () => {
  setBudgetData({
    categories: [food, gifts],
    expenses: [
      expense({ id: 'a', categoryId: 'food', amount: 3000, merchant: 'carrefour', date: TODAY }),
      expense({ id: 'b', categoryId: 'food', amount: 4000, merchant: 'Carrefour', date: TODAY }),
      expense({ id: 'c', categoryId: 'gifts', amount: 5000, merchant: 'Toy shop', date: TODAY }),
    ],
  });
  await render(<AnalyticsScreen />);
  expect(screen.getByText('JOD 43.000 left of JOD 50.000')).toBeTruthy();
  expect(within(screen.getByTestId('insight-category-gifts')).getByText(/No budget/)).toBeTruthy();
  expect(screen.getByText('2 times')).toBeTruthy();
});

it('forecasts only the month in progress', async () => {
  setBudgetData({ categories: [food], expenses: [expense({ categoryId: 'food', amount: 9000, date: LAST_MONTH_DAY })] });
  await render(<AnalyticsScreen />);
  expect(screen.getByTestId('daily-average')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('period-previous'));
  expect(screen.queryByTestId('projection')).toBeNull();
  expect(text('overview-spent')).toBe('JOD 9.000 Spent');
});

it('asks for data first', async () => {
  setBudgetData();
  await render(<AnalyticsScreen />);
  expect(screen.getByText('No data yet')).toBeTruthy();
});
