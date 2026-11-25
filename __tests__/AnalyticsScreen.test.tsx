import { act, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import Analytics from '@/app/(tabs)/analytics';
import { useBudgetStore } from '@/store/budgetStore';
import { makeCategory, setBudgetData } from '@/test-utils/store';

it('updates the overview when an expense is added', async () => {
  setBudgetData({ categories: [makeCategory({ budget: 50 })] });
  await render(<Analytics />);

  await act(async () => {
    useBudgetStore.getState().addExpense({ categoryId: 'c1', amount: 60, merchant: 'Market', notes: '', tags: [], date: '2026-11-20' });
  });

  expect(within(screen.getByTestId('overview-spent')).getByText(/JOD\s+60/)).toBeTruthy();
  expect(within(screen.getByTestId('overview-overspent')).getByText('1')).toBeTruthy();
});
