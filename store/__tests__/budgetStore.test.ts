import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { useBudgetStore } from '../budgetStore';

it('saves the budget in the SQLite key-value store', async () => {
  useBudgetStore.setState({ categories: [{ id: 'c1', name: 'Food', budget: 50, color: '#EF4444', icon: 'coffee', createdAt: '2026-11-01T08:00:00.000Z', lastResetAt: null, pinned: false }] });
  const saved = await new SQLiteStorage('budget-tracker.db').getItemAsync('budget-storage-v1');
  expect(JSON.parse(saved!).state.categories[0].name).toBe('Food');
});
