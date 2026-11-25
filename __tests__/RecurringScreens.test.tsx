import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RecurringScreen from '@/app/recurring';
import RecurringFormScreen from '@/app/recurring-form';
import { useBudgetStore } from '@/store/budgetStore';
import { category, recurring } from '@/test-utils/data';
import { TODAY } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';
import { addDays } from '@/utils/dates';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);
jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true), notify: jest.fn() }));
jest.mock('@/components/KeyboardAwareScrollViewCompat', () => ({
  KeyboardAwareScrollViewCompat: jest.requireActual('react-native').ScrollView,
}));

const home = category({ id: 'home', name: 'Home' });
const rules = () => useBudgetStore.getState().recurring;

beforeEach(() => resetRouter());

it('lists recurring expenses with their next date', async () => {
  const tomorrow = addDays(TODAY, 1);
  setBudgetData({ categories: [home], recurring: [recurring({ id: 'rent', categoryId: 'home', merchant: 'Rent', startDate: tomorrow })] });
  await render(<RecurringScreen />);
  expect(screen.getByText('Rent')).toBeTruthy();
  expect(screen.getByText(/Every month · Next /)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('recurring-rent'));
  expect(routerMock.router.push).toHaveBeenCalledWith({ pathname: '/recurring-form', params: { id: 'rent' } });
});

it('explains recurring expenses when there are none', async () => {
  setBudgetData({ categories: [home] });
  await render(<RecurringScreen />);
  expect(screen.getByText('No recurring expenses')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('add-recurring'));
  expect(routerMock.router.push).toHaveBeenCalledWith('/recurring-form');
});

it('creates a weekly expense starting today and adds today’s', async () => {
  setBudgetData({ categories: [home] });
  await render(<RecurringFormScreen />);
  await fireEvent.changeText(screen.getByTestId('recurring-amount-input'), '15');
  await fireEvent.press(screen.getByTestId('frequency-weekly'));
  await fireEvent.changeText(screen.getByTestId('recurring-merchant-input'), 'Gym');
  await fireEvent.press(screen.getByTestId('save-recurring'));
  expect(rules()).toEqual([expect.objectContaining({ frequency: 'weekly', amount: 15000, merchant: 'Gym', startDate: TODAY })]);
  expect(useBudgetStore.getState().expenses).toEqual([expect.objectContaining({ amount: 15000, date: TODAY })]);
});

it('changes the amount and pauses, then stops repeating', async () => {
  setBudgetData({ categories: [home], recurring: [recurring({ id: 'rent', categoryId: 'home', startDate: addDays(TODAY, 3) })] });
  resetRouter({ id: 'rent' });
  await render(<RecurringFormScreen />);
  await fireEvent.changeText(screen.getByTestId('recurring-amount-input'), '400');
  await fireEvent(screen.getByTestId('recurring-paused'), 'valueChange', true);
  await fireEvent.press(screen.getByTestId('save-recurring'));
  expect(rules()[0]).toMatchObject({ amount: 400000, paused: true });
});

it('stops a recurring expense but keeps what it added', async () => {
  setBudgetData({ categories: [home], recurring: [recurring({ id: 'rent', categoryId: 'home' })] });
  resetRouter({ id: 'rent' });
  await render(<RecurringFormScreen />);
  await fireEvent.press(screen.getByTestId('delete-recurring'));
  await waitFor(() => expect(rules()).toEqual([]));
});

it('needs a positive amount', async () => {
  setBudgetData({ categories: [home] });
  await render(<RecurringFormScreen />);
  await fireEvent.press(screen.getByTestId('save-recurring'));
  expect(screen.getByTestId('recurring-error')).toHaveTextContent('Enter an amount');
  expect(rules()).toEqual([]);
});
