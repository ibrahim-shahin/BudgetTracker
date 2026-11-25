import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { newId, useBudgetStore } from '../budgetStore';
import { category, expense } from '@/test-utils/data';
import { setBudgetData } from '@/test-utils/store';

const store = () => useBudgetStore.getState();
const food = category({ id: 'food', budgets: [{ from: '2026-01', amount: 100000 }] });
const base = { merchant: '', notes: '', tags: [] as string[] };

beforeEach(() => setBudgetData({ categories: [food] }));

describe('categories', () => {
  it('adds a category with its budget from this month', () => {
    const id = store().addCategory({ name: '  Fuel ', budget: 50000, color: '#22C55E', icon: 'truck' }, '2026-11');
    expect(store().categories.find(c => c.id === id)).toMatchObject({ name: 'Fuel', budgets: [{ from: '2026-11', amount: 50000 }], pinned: false });
  });

  it('keeps last month\'s budget when the budget changes this month', () => {
    store().updateCategory('food', { name: 'Groceries', budget: 150000, color: '#22C55E', icon: 'shopping-cart' }, '2026-11');
    expect(store().categories[0]).toMatchObject({
      name: 'Groceries',
      budgets: [{ from: '2026-01', amount: 100000 }, { from: '2026-11', amount: 150000 }],
    });
  });

  it('deletes a category with its expenses', () => {
    setBudgetData({
      categories: [food, category({ id: 'fun' })],
      expenses: [expense({ id: 'a', categoryId: 'food' }), expense({ id: 'b', categoryId: 'fun' })],
    });
    store().deleteCategory('food');
    expect(store().categories.map(c => c.id)).toEqual(['fun']);
    expect(store().expenses.map(e => e.id)).toEqual(['b']);
  });

  it('refuses a nameless category or a broken budget', () => {
    expect(() => store().addCategory({ name: ' ', budget: 0, color: '#22C55E', icon: 'tag' }, '2026-11')).toThrow('name');
    expect(() => store().addCategory({ name: 'X', budget: 1.5, color: '#22C55E', icon: 'tag' }, '2026-11')).toThrow('budget');
  });
});

describe('expenses', () => {
  it('adds, edits and deletes an expense, tidying its text', () => {
    const id = store().addExpense({ categoryId: 'food', amount: 12345, merchant: ' Carrefour ', notes: '', tags: ['Weekly', 'weekly', ' '], date: '2026-11-25' });
    expect(store().expenses[0]).toMatchObject({ id, amount: 12345, merchant: 'Carrefour', tags: ['Weekly'], date: '2026-11-25' });

    store().updateExpense(id, { categoryId: 'food', amount: 2000, merchant: 'Cozmo', notes: 'milk', tags: [], date: '2026-11-24' });
    expect(store().expenses[0]).toMatchObject({ id, amount: 2000, merchant: 'Cozmo', notes: 'milk', date: '2026-11-24' });

    const removed = store().deleteExpense(id);
    expect(store().expenses).toEqual([]);
    store().restoreExpense(removed!);
    expect(store().expenses).toEqual([removed]);
  });

  it('refuses amounts that are not whole minor units, and bad dates or categories', () => {
    const input = { ...base, categoryId: 'food', amount: 100, date: '2026-11-25' };
    expect(() => store().addExpense({ ...input, amount: 0.3 })).toThrow('amount');
    expect(() => store().addExpense({ ...input, amount: 0 })).toThrow('amount');
    expect(() => store().addExpense({ ...input, date: '2026-02-30' })).toThrow('date');
    expect(() => store().addExpense({ ...input, categoryId: 'ghost' })).toThrow('category');
  });
});

describe('settings', () => {
  it('converts amounts when the currency changes and says how many were rounded', () => {
    setBudgetData({ categories: [food], expenses: [expense({ amount: 12345 }), expense({ id: 'e2', amount: 12340 })] });
    expect(store().setCurrency('USD')).toBe(1);
    expect(store().currency).toBe('USD');
    expect(store().expenses.map(e => e.amount)).toEqual([1235, 1234]);
    expect(store().categories[0].budgets[0].amount).toBe(10000);

    expect(store().setCurrency('KWD')).toBe(0);
    expect(store().expenses.map(e => e.amount)).toEqual([12350, 12340]);
  });

  it('keeps an expense above zero when rounding would make it zero', () => {
    setBudgetData({ categories: [food], expenses: [expense({ amount: 4 })] });
    store().setCurrency('USD');
    expect(store().expenses[0].amount).toBe(1);
  });

  it('checks the month start day and the currency', () => {
    store().setPeriodStartDay(25);
    expect(store().periodStartDay).toBe(25);
    expect(() => store().setPeriodStartDay(32)).toThrow();
    expect(() => store().setCurrency('XYZ')).toThrow();
  });
});

describe('saving', () => {
  it('saves the data, without the actions, in the SQLite key-value store', async () => {
    store().addExpense({ ...base, categoryId: 'food', amount: 2500, date: '2026-11-25' });
    const saved = await new SQLiteStorage('budget-tracker.db').getItemAsync('budget-tracker');
    const parsed = JSON.parse(saved!);
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.state).sort()).toEqual(['categories', 'currency', 'expenses', 'periodStartDay', 'theme']);
    expect(parsed.state.expenses[0].amount).toBe(2500);
  });

  it('makes ids that are unique and safe in a link', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
