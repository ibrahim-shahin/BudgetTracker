import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import CategoryFormScreen from '@/app/category-form';
import { useBudgetStore } from '@/store/budgetStore';
import { category, expense } from '@/test-utils/data';
import { LAST_MONTH, THIS_MONTH } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));
jest.mock('@/components/KeyboardAwareScrollViewCompat', () => ({
  KeyboardAwareScrollViewCompat: jest.requireActual('react-native').ScrollView,
}));

const categories = () => useBudgetStore.getState().categories;

beforeEach(() => {
  resetRouter();
  setBudgetData();
});

it('creates a category with a monthly budget in fils', async () => {
  await render(<CategoryFormScreen />);
  await fireEvent.changeText(screen.getByTestId('category-name-input'), 'Groceries');
  await fireEvent.changeText(screen.getByTestId('category-budget-input'), '150.5');
  await fireEvent.press(screen.getByTestId('icon-coffee'));
  await fireEvent.press(screen.getByTestId('color-#22C55E'));
  await fireEvent.press(screen.getByTestId('save-category'));

  expect(categories()).toEqual([
    expect.objectContaining({ name: 'Groceries', budgets: [{ from: THIS_MONTH, amount: 150500 }], icon: 'coffee', color: '#22C55E' }),
  ]);
  await waitFor(() => expect(routerMock.router.back).toHaveBeenCalled());
});

it('allows a category without a budget, but not without a name', async () => {
  await render(<CategoryFormScreen />);
  await fireEvent.press(screen.getByTestId('save-category'));
  expect(screen.getByText('Give the category a name')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('category-name-input'), 'Gifts');
  await fireEvent.changeText(screen.getByTestId('category-budget-input'), '');
  await fireEvent.press(screen.getByTestId('save-category'));
  expect(categories()[0].budgets).toEqual([{ from: THIS_MONTH, amount: 0 }]);
});

it('refuses more decimals than the currency has', async () => {
  setBudgetData({ currency: 'USD' });
  await render(<CategoryFormScreen />);
  await fireEvent.changeText(screen.getByTestId('category-name-input'), 'Fuel');
  await fireEvent.changeText(screen.getByTestId('category-budget-input'), '12.345');
  // The field keeps two decimals as it is typed.
  expect(screen.getByTestId('category-budget-input').props.value).toBe('12.34');
});

it("changes the budget from this month on and keeps last month's", async () => {
  setBudgetData({ categories: [category({ id: 'food', name: 'Food', budgets: [{ from: LAST_MONTH, amount: 100000 }] })] });
  resetRouter({ id: 'food' });
  await render(<CategoryFormScreen />);
  expect(screen.getByTestId('category-budget-input').props.value).toBe('100');
  await fireEvent.changeText(screen.getByTestId('category-budget-input'), '120');
  await fireEvent.press(screen.getByTestId('save-category'));
  expect(categories()[0].budgets).toEqual([
    { from: LAST_MONTH, amount: 100000 },
    { from: THIS_MONTH, amount: 120000 },
  ]);
});

it('deletes a category and its expenses, then goes back to the list', async () => {
  setBudgetData({ categories: [category({ id: 'food' })], expenses: [expense({ categoryId: 'food' })] });
  routerMock.router.canDismiss.mockReturnValueOnce(true);
  resetRouter({ id: 'food' });
  await render(<CategoryFormScreen />);
  await fireEvent.press(screen.getByTestId('delete-category'));
  await waitFor(() => expect(categories()).toEqual([]));
  expect(useBudgetStore.getState().expenses).toEqual([]);
  await waitFor(() => expect(routerMock.router.dismissAll).toHaveBeenCalled());
});
