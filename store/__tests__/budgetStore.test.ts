import { SQLiteStorage } from 'expo-sqlite/kv-store';

import { newId, useBudgetStore } from '../budgetStore';
import { category, expense, recurring } from '@/test-utils/data';
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

  it('deletes a category with its expenses and recurring expenses', () => {
    setBudgetData({
      categories: [food, category({ id: 'fun' })],
      expenses: [expense({ id: 'a', categoryId: 'food' }), expense({ id: 'b', categoryId: 'fun' })],
      recurring: [recurring({ id: 'r', categoryId: 'food' })],
    });
    store().deleteCategory('food');
    expect(store().categories.map(c => c.id)).toEqual(['fun']);
    expect(store().expenses.map(e => e.id)).toEqual(['b']);
    expect(store().recurring).toEqual([]);
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

describe('recurring expenses', () => {
  it('adds the dates already due when one is created, and never twice', () => {
    const id = store().addRecurring({ ...base, categoryId: 'food', amount: 350000, date: '2026-09-30', frequency: 'monthly' }, '2026-11-25');
    expect(store().expenses.map(e => [e.date, e.amount, e.recurringId])).toEqual([
      ['2026-09-30', 350000, id],
      ['2026-10-30', 350000, id],
    ]);
    expect(store().applyRecurring('2026-11-25')).toBe(0);
    expect(store().applyRecurring('2026-11-30')).toBe(1);
    expect(store().expenses).toHaveLength(3);
  });

  it("doesn't bring back a due expense the user deleted", () => {
    store().addRecurring({ ...base, categoryId: 'food', amount: 1000, date: '2026-11-01', frequency: 'weekly' }, '2026-11-08');
    const second = store().expenses.find(e => e.date === '2026-11-08')!;
    store().deleteExpense(second.id);
    expect(store().applyRecurring('2026-11-10')).toBe(0);
    expect(store().expenses.map(e => e.date)).toEqual(['2026-11-01']);
  });

  it('skips the dates missed while paused', () => {
    setBudgetData({ categories: [food], recurring: [recurring({ id: 'r', startDate: '2026-01-15', lastAdded: '2026-01-15', paused: true })] });
    jest.useFakeTimers({ now: new Date(2026, 10, 20, 12) });
    try {
      store().setRecurringPaused('r', false);
    } finally {
      jest.useRealTimers();
    }
    expect(store().recurring[0]).toMatchObject({ paused: false, lastAdded: '2026-11-15' });
    expect(store().applyRecurring('2026-11-20')).toBe(0);
    expect(store().applyRecurring('2026-12-15')).toBe(1);
  });

  it('keeps the expenses it added when it is deleted', () => {
    const id = store().addRecurring({ ...base, categoryId: 'food', amount: 1000, date: '2026-11-01', frequency: 'monthly' }, '2026-11-01');
    store().deleteRecurring(id);
    expect(store().recurring).toEqual([]);
    expect(store().expenses).toHaveLength(1);
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
    expect(Object.keys(parsed.state).sort()).toEqual(['categories', 'currency', 'expenses', 'lastBackupAt', 'periodStartDay', 'recurring', 'theme']);
    expect(parsed.state.expenses[0].amount).toBe(2500);
  });

  it('makes ids that are unique and safe in a link', () => {
    const ids = new Set(Array.from({ length: 2000 }, () => newId()));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+$/);
  });
});
