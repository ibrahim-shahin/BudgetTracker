import { render, screen } from '@testing-library/react-native';
import React from 'react';

import CategoryDetail from '@/app/category/[id]';
import { makeCategory, makeExpense, setBudgetData } from '@/test-utils/store';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

it('opens a category without crashing', async () => {
  // Regression: selectors that built a new array on every call made the
  // screen re-render forever ("Maximum update depth exceeded").
  setBudgetData({
    categories: [makeCategory()],
    expenses: [makeExpense({ amount: 12, merchant: 'Carrefour' })],
    events: [{ id: 'v1', categoryId: 'c1', type: 'expense_added', description: '12 spent at Carrefour', amount: 12, relatedId: 'e1', createdAt: '2026-11-20T09:00:00.000Z' }],
  });

  await render(<CategoryDetail />);

  expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
  expect(screen.getByText('12 spent at Carrefour')).toBeTruthy();
});
