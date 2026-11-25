import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import CategoryScreen from '@/app/category/[id]';
import { useViewStore } from '@/store/viewStore';
import { category, expense } from '@/test-utils/data';
import { LAST_MONTH, LAST_MONTH_DAY, TODAY, YESTERDAY } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';
import { addDays, periodOf, periodRange } from '@/utils/dates';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);

const food = category({ id: 'food', name: 'Food', budgets: [{ from: LAST_MONTH, amount: 50000 }] });
const text = (id: string) => within(screen.getByTestId(id)).getAllByText(/./).map(n => n.props.children).join(' ');

beforeEach(() => {
  resetRouter({ id: 'food' });
  useViewStore.setState({ period: null });
});

it("opens a category without crashing and lists this month's expenses (regression: it re-rendered forever)", async () => {
  setBudgetData({
    categories: [food],
    expenses: [
      expense({ id: 'a', categoryId: 'food', amount: 12500, merchant: 'Carrefour', date: TODAY }),
      expense({ id: 'b', categoryId: 'food', amount: 40000, merchant: 'Cozmo', date: LAST_MONTH_DAY }),
    ],
  });
  await render(<CategoryScreen />);
  expect(screen.getByText('Carrefour')).toBeTruthy();
  expect(screen.queryByText('Cozmo')).toBeNull();
  expect(text('category-spent')).toBe('JOD 12.500 Spent');
  expect(text('category-left')).toBe('JOD 37.500 Left');

  await fireEvent.press(screen.getByTestId('expense-a'));
  expect(routerMock.router.push).toHaveBeenCalledWith({ pathname: '/expense-form', params: { id: 'a' } });
});

it('shows how much over budget a month went', async () => {
  setBudgetData({ categories: [food], expenses: [expense({ id: 'b', categoryId: 'food', amount: 60000, date: LAST_MONTH_DAY })] });
  await render(<CategoryScreen />);
  await fireEvent.press(screen.getByTestId('period-previous'));
  expect(text('category-left')).toBe('JOD 10.000 Over by');
});

it('counts an expense on the first day of a month in that month (regression: it was dropped after a reset)', async () => {
  // Months starting on the 25th: the 25th belongs to the new month, the 24th to the one before.
  const { start } = periodRange(periodOf(TODAY, 25), 25);
  setBudgetData({
    periodStartDay: 25,
    categories: [food],
    expenses: [
      expense({ id: 'first', categoryId: 'food', amount: 1000, merchant: 'First day', date: start }),
      expense({ id: 'before', categoryId: 'food', amount: 2000, merchant: 'Day before', date: addDays(start, -1) }),
    ],
  });
  await render(<CategoryScreen />);
  expect(screen.getByText('First day')).toBeTruthy();
  expect(screen.queryByText('Day before')).toBeNull();
  expect(text('category-spent')).toBe('JOD 1.000 Spent');
});

it('adds an expense to this category', async () => {
  setBudgetData({ categories: [food], expenses: [expense({ categoryId: 'food', date: YESTERDAY })] });
  await render(<CategoryScreen />);
  await fireEvent.press(screen.getByTestId('add-expense'));
  expect(routerMock.router.push).toHaveBeenCalledWith({ pathname: '/expense-form', params: { categoryId: 'food' } });
  await fireEvent.press(screen.getByTestId('edit-category'));
  expect(routerMock.router.push).toHaveBeenLastCalledWith({ pathname: '/category-form', params: { id: 'food' } });
});

it('says when the category is gone', async () => {
  setBudgetData();
  await render(<CategoryScreen />);
  expect(screen.getByText('Category not found')).toBeTruthy();
});
