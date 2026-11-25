import { act, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import Dashboard from '@/app/(tabs)/index';
import { useBudgetStore } from '@/store/budgetStore';
import { makeCategory, setBudgetData } from '@/test-utils/store';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

it('updates the spent and remaining totals when an expense is added', async () => {
  // Regression: the totals were memoised on the store's getter functions,
  // which never change, so they kept showing the old amounts.
  setBudgetData({ categories: [makeCategory({ budget: 50 })] });
  await render(<Dashboard />);
  expect(within(screen.getByTestId('summary-spent')).getByText(/JOD\s+0/)).toBeTruthy();

  await act(async () => {
    useBudgetStore.getState().addExpense({ categoryId: 'c1', amount: 12, merchant: '', notes: '', tags: [], date: '2026-11-20' });
  });

  expect(within(screen.getByTestId('summary-spent')).getByText(/JOD\s+12/)).toBeTruthy();
  expect(within(screen.getByTestId('summary-remaining')).getByText(/JOD\s+38/)).toBeTruthy();
});
