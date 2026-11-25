import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { KeyboardController } from 'react-native-keyboard-controller';

import ExpenseFormScreen from '@/app/expense-form';
import { useBudgetStore } from '@/store/budgetStore';
import { category, expense } from '@/test-utils/data';
import { TODAY, YESTERDAY } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';
import { confirm } from '@/utils/confirm';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));
jest.mock('@/components/KeyboardAwareScrollViewCompat', () => ({
  KeyboardAwareScrollViewCompat: jest.requireActual('react-native').ScrollView,
}));

const food = category({ id: 'food', name: 'Food' });
const fuel = category({ id: 'fuel', name: 'Fuel' });
const expenses = () => useBudgetStore.getState().expenses;

beforeEach(() => {
  resetRouter();
  jest.mocked(confirm).mockReset().mockResolvedValue(true);
  setBudgetData({ categories: [food, fuel] });
});

async function typeAmount(text: string) {
  await fireEvent.changeText(screen.getByTestId('amount-input'), text);
}

it('saves an expense in fils and closes once the keyboard is down', async () => {
  resetRouter({ categoryId: 'fuel' });
  await render(<ExpenseFormScreen />);
  await typeAmount('12.345');
  await fireEvent.changeText(screen.getByTestId('merchant-input'), ' Total ');
  await fireEvent.changeText(screen.getByTestId('tags-input'), 'car, weekly');
  await fireEvent.press(screen.getByTestId('save-expense'));

  expect(expenses()).toEqual([expect.objectContaining({ categoryId: 'fuel', amount: 12345, merchant: 'Total', tags: ['car', 'weekly'], date: TODAY })]);
  expect(KeyboardController.dismiss).toHaveBeenCalled();
  await waitFor(() => expect(routerMock.router.back).toHaveBeenCalledTimes(1));
});

it('reads a decimal comma (regression: "1,5" was saved as 1)', async () => {
  resetRouter({ categoryId: 'food' });
  await render(<ExpenseFormScreen />);
  await typeAmount('1,5');
  expect(screen.getByTestId('amount-input').props.value).toBe('1.5');
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(expenses()[0].amount).toBe(1500);
});

it('reads Arabic-Indic digits and the Arabic decimal separator', async () => {
  resetRouter({ categoryId: 'food' });
  await render(<ExpenseFormScreen />);
  await typeAmount('١٢٫٧٥');
  expect(screen.getByTestId('amount-input').props.value).toBe('12.75');
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(expenses()[0].amount).toBe(12750);
});

it('keeps sums exact (regression: 0.1 + 0.2 was not 0.3)', async () => {
  setBudgetData({ categories: [food], expenses: [expense({ id: 'a', categoryId: 'food', amount: 100 })] });
  resetRouter({ categoryId: 'food' });
  await render(<ExpenseFormScreen />);
  await typeAmount('0.2');
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(expenses().reduce((sum, e) => sum + e.amount, 0)).toBe(300);
});

it('explains what is wrong instead of saving', async () => {
  await render(<ExpenseFormScreen />);
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(screen.getByTestId('amount-error')).toHaveTextContent('Enter an amount');
  expect(screen.getByText('Choose a category')).toBeTruthy();

  await typeAmount('0');
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(screen.getByTestId('amount-error')).toHaveTextContent(/more than zero/);
  expect(expenses()).toEqual([]);
  expect(routerMock.router.back).not.toHaveBeenCalled();
});

it('moves the date a day at a time', async () => {
  resetRouter({ categoryId: 'food' });
  await render(<ExpenseFormScreen />);
  expect(screen.getByTestId('date-label')).toHaveTextContent('Today');
  await fireEvent.press(screen.getByTestId('date-previous'));
  expect(screen.getByTestId('date-label')).toHaveTextContent('Yesterday');
  await typeAmount('3');
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(expenses()[0].date).toBe(YESTERDAY);
});

it('edits an existing expense', async () => {
  setBudgetData({ categories: [food, fuel], expenses: [expense({ id: 'x', categoryId: 'food', amount: 12500, merchant: 'Carrefour', date: YESTERDAY })] });
  resetRouter({ id: 'x' });
  await render(<ExpenseFormScreen />);
  expect(screen.getByTestId('amount-input').props.value).toBe('12.5');
  expect(screen.getByTestId('merchant-input').props.value).toBe('Carrefour');
  await typeAmount('13.25');
  await fireEvent.press(screen.getByTestId('category-chip-fuel'));
  await fireEvent.press(screen.getByTestId('save-expense'));
  expect(expenses()[0]).toMatchObject({ id: 'x', amount: 13250, categoryId: 'fuel', date: YESTERDAY });
});

it('deletes an expense after asking', async () => {
  setBudgetData({ categories: [food], expenses: [expense({ id: 'x', categoryId: 'food' })] });
  resetRouter({ id: 'x' });
  await render(<ExpenseFormScreen />);
  await fireEvent.press(screen.getByTestId('delete-expense'));
  await waitFor(() => expect(expenses()).toEqual([]));
  expect(confirm).toHaveBeenCalledWith('Delete this expense?', expect.any(String), 'Delete', true);
  await waitFor(() => expect(routerMock.router.back).toHaveBeenCalled());
});

it('keeps an expense when deleting is cancelled', async () => {
  jest.mocked(confirm).mockResolvedValueOnce(false);
  setBudgetData({ categories: [food], expenses: [expense({ id: 'x', categoryId: 'food' })] });
  resetRouter({ id: 'x' });
  await render(<ExpenseFormScreen />);
  await fireEvent.press(screen.getByTestId('delete-expense'));
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(expenses()).toHaveLength(1);
  expect(routerMock.router.back).not.toHaveBeenCalled();
});

it('can repeat a new expense every month', async () => {
  resetRouter({ categoryId: 'food' });
  await render(<ExpenseFormScreen />);
  await typeAmount('350');
  await fireEvent.changeText(screen.getByTestId('merchant-input'), 'Rent');
  await fireEvent.press(screen.getByTestId('repeat-monthly'));
  await fireEvent.press(screen.getByTestId('save-expense'));

  const { recurring } = useBudgetStore.getState();
  expect(recurring).toEqual([expect.objectContaining({ frequency: 'monthly', amount: 350000, startDate: TODAY, lastAdded: TODAY })]);
  expect(expenses()).toEqual([expect.objectContaining({ amount: 350000, merchant: 'Rent', date: TODAY, recurringId: recurring[0].id })]);
});

it('says when the expense to edit is gone', async () => {
  resetRouter({ id: 'missing' });
  await render(<ExpenseFormScreen />);
  expect(screen.getByText('This expense no longer exists.')).toBeTruthy();
});
