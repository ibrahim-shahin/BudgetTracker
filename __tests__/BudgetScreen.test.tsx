import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import React from 'react';

import BudgetScreen from '@/app/(tabs)/index';
import { useBudgetStore } from '@/store/budgetStore';
import { useViewStore } from '@/store/viewStore';
import { category, expense } from '@/test-utils/data';
import { LAST_MONTH, LAST_MONTH_DAY, THIS_MONTH, TODAY } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));

const food = category({ id: 'food', name: 'Food', budgets: [{ from: LAST_MONTH, amount: 100000 }, { from: THIS_MONTH, amount: 150500 }] });
const fuel = category({ id: 'fuel', name: 'Fuel', color: '#F97316', icon: 'truck', budgets: [{ from: LAST_MONTH, amount: 50000 }] });

beforeEach(() => {
  resetRouter();
  useViewStore.setState({ period: null });
});

const cellText = (id: string) => within(screen.getByTestId(id)).getAllByText(/./).map(n => n.props.children).join(' ');

it('starts with a way to create the first category', async () => {
  setBudgetData();
  await render(<BudgetScreen />);
  await fireEvent.press(screen.getByText('Create a category'));
  expect(routerMock.router.push).toHaveBeenCalledWith('/category-form');
  expect(screen.queryByTestId('add-expense')).toBeNull();
});

it("shows this month's budget and spending, to the fils", async () => {
  setBudgetData({
    categories: [food, fuel],
    expenses: [
      expense({ id: 'a', categoryId: 'food', amount: 12345, date: TODAY }),
      expense({ id: 'b', categoryId: 'food', amount: 100, date: TODAY }),
      expense({ id: 'c', categoryId: 'fuel', amount: 99999, date: LAST_MONTH_DAY }),
    ],
  });
  await render(<BudgetScreen />);
  // Regression: the summary rounded to whole dinars ("JOD 101") and floats drifted.
  expect(cellText('summary-budget')).toBe('JOD 200.500 Budget');
  expect(cellText('summary-spent')).toBe('JOD 12.445 Spent');
  expect(cellText('summary-remaining')).toBe('JOD 188.055 Left');
});

it("shows last month with last month's budgets", async () => {
  setBudgetData({ categories: [food, fuel], expenses: [expense({ id: 'c', categoryId: 'fuel', amount: 60000, date: LAST_MONTH_DAY })] });
  await render(<BudgetScreen />);
  await fireEvent.press(screen.getByTestId('period-previous'));
  expect(cellText('summary-budget')).toBe('JOD 150.000 Budget');
  expect(cellText('summary-remaining')).toBe('JOD 90.000 Left');
  expect(within(screen.getByTestId('category-fuel')).getByText('OVER')).toBeTruthy();
});

it('updates the totals when an expense is added (regression: they kept the old amounts)', async () => {
  setBudgetData({ categories: [food] });
  await render(<BudgetScreen />);
  await act(async () => {
    useBudgetStore.getState().addExpense({ categoryId: 'food', amount: 12000, merchant: '', notes: '', tags: [], date: TODAY });
  });
  expect(cellText('summary-spent')).toBe('JOD 12.000 Spent');
  expect(cellText('summary-remaining')).toBe('JOD 138.500 Left');
});

it('filters to the categories over budget', async () => {
  setBudgetData({ categories: [food, fuel], expenses: [expense({ categoryId: 'fuel', amount: 60000, date: TODAY })] });
  await render(<BudgetScreen />);
  await fireEvent.press(screen.getByTestId('filter-overspent'));
  expect(screen.queryByTestId('category-food')).toBeNull();
  expect(screen.getByTestId('category-fuel')).toBeTruthy();
});

it('opens the expense form, for any category or for one', async () => {
  setBudgetData({ categories: [food, fuel] });
  await render(<BudgetScreen />);
  await fireEvent.press(screen.getByTestId('add-expense'));
  expect(routerMock.router.push).toHaveBeenLastCalledWith({ pathname: '/expense-form', params: {} });
  await fireEvent.press(screen.getByTestId('category-add-fuel'));
  expect(routerMock.router.push).toHaveBeenLastCalledWith({ pathname: '/expense-form', params: { categoryId: 'fuel' } });
  await fireEvent.press(screen.getByTestId('category-food'));
  expect(routerMock.router.push).toHaveBeenLastCalledWith({ pathname: '/category/[id]', params: { id: 'food' } });
});

it('pins and deletes a category from its menu', async () => {
  setBudgetData({ categories: [food, fuel], expenses: [expense({ categoryId: 'fuel' })] });
  await render(<BudgetScreen />);
  await fireEvent.press(screen.getByTestId('category-menu-fuel'));
  await fireEvent.press(screen.getByText('Pin to top'));
  expect(useBudgetStore.getState().categories.find(c => c.id === 'fuel')?.pinned).toBe(true);

  await fireEvent.press(screen.getByTestId('category-menu-fuel'));
  await fireEvent.press(screen.getByText('Delete'));
  await waitFor(() => expect(screen.queryByTestId('category-fuel')).toBeNull());
  expect(useBudgetStore.getState().expenses).toEqual([]);
});
