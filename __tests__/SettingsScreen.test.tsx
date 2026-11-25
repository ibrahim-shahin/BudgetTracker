import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import SettingsScreen from '@/app/(tabs)/settings';
import { useBudgetStore } from '@/store/budgetStore';
import { category, expense } from '@/test-utils/data';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';
import { confirm } from '@/utils/confirm';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));

const state = () => useBudgetStore.getState();

beforeEach(() => {
  resetRouter();
  jest.mocked(confirm).mockClear();
  setBudgetData({ categories: [category({ id: 'food' })], expenses: [expense({ categoryId: 'food', amount: 12345 })] });
});

it('switches currency after warning about rounding, keeping the written amounts', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('currency-row'));
  await fireEvent.press(screen.getByTestId('currency-USD'));
  await waitFor(() => expect(state().currency).toBe('USD'));
  expect(jest.mocked(confirm).mock.calls[0][1]).toMatch(/1 amount has more decimals than USD uses and will be rounded/);
  expect(state().expenses[0].amount).toBe(1235);
});

it('leaves the currency alone when the switch is cancelled', async () => {
  jest.mocked(confirm).mockResolvedValueOnce(false);
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('currency-row'));
  await fireEvent.press(screen.getByTestId('currency-KWD'));
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(state().currency).toBe('JOD');
  expect(state().expenses[0].amount).toBe(12345);
});

it('moves the start of the budget month', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByTestId('start-day')).toHaveTextContent('1st');
  await fireEvent.press(screen.getByTestId('start-day-up'));
  await fireEvent.press(screen.getByTestId('start-day-up'));
  expect(screen.getByTestId('start-day')).toHaveTextContent('3rd');
  expect(state().periodStartDay).toBe(3);
});

it('changes the theme and opens recurring expenses and backups', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('theme-dark'));
  expect(state().theme).toBe('dark');
  await fireEvent.press(screen.getByTestId('recurring-row'));
  expect(routerMock.router.push).toHaveBeenCalledWith('/recurring');
  await fireEvent.press(screen.getByTestId('backup-row'));
  expect(routerMock.router.push).toHaveBeenCalledWith('/backup');
});

it('deletes all data only after asking', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('clear-all'));
  await waitFor(() => expect(state().expenses).toEqual([]));
  expect(state().categories).toEqual([]);
  expect(confirm).toHaveBeenCalledWith('Delete all data?', expect.stringContaining('1 category and 1 expense from'), 'Delete everything', true);
});
