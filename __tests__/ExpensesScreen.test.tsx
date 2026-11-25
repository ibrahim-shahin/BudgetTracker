import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import ExpensesScreen from '@/app/(tabs)/expenses';
import { useViewStore } from '@/store/viewStore';
import { category, expense } from '@/test-utils/data';
import { LAST_MONTH_DAY, TODAY, YESTERDAY } from '@/test-utils/dates';
import { resetRouter, routerMock } from '@/test-utils/router';
import { setBudgetData } from '@/test-utils/store';

jest.mock('expo-router', () => require('@/test-utils/router').routerMock);

beforeEach(() => {
  resetRouter();
  useViewStore.setState({ period: null });
  setBudgetData({
    categories: [category({ id: 'food', name: 'Groceries' }), category({ id: 'health', name: 'Health' })],
    expenses: [
      expense({ id: 'a', categoryId: 'food', amount: 12345, merchant: 'Carrefour', tags: ['weekly'], date: TODAY }),
      expense({ id: 'b', categoryId: 'food', amount: 2000, merchant: 'Bakery', date: YESTERDAY }),
      expense({ id: 'c', categoryId: 'health', amount: 7500, merchant: 'صيدلية الأمل', notes: 'vitamins', date: LAST_MONTH_DAY }),
    ],
  });
});

it("lists this month's expenses by day with totals", async () => {
  await render(<ExpensesScreen />);
  expect(screen.getByTestId('expenses-total')).toHaveTextContent(/^2 expenses · JOD 14\.345$/);
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByText('Yesterday')).toBeTruthy();
  expect(screen.queryByText('صيدلية الأمل')).toBeNull();
  await fireEvent.press(screen.getByTestId('expense-a'));
  expect(routerMock.router.push).toHaveBeenCalledWith({ pathname: '/expense-form', params: { id: 'a' } });
});

it('searches every month by merchant, note, tag, category or amount', async () => {
  await render(<ExpensesScreen />);
  const search = (q: string) => fireEvent.changeText(screen.getByTestId('search-input'), q);

  await search('صيدليه'); // spelt without the teh marbuta
  expect(screen.getByText('صيدلية الأمل')).toBeTruthy();
  expect(screen.getByTestId('expenses-total')).toHaveTextContent(/1 expense · JOD 7\.500 · all months/);

  await search('WEEKLY');
  expect(screen.getByText('Carrefour')).toBeTruthy();
  await search('groceries bak');
  expect(screen.getByText('Bakery')).toBeTruthy();
  expect(screen.queryByText('Carrefour')).toBeNull();
  await search('12.345');
  expect(screen.getByText('Carrefour')).toBeTruthy();
  await search('nothing like this');
  expect(screen.getByText('No matches')).toBeTruthy();
});
