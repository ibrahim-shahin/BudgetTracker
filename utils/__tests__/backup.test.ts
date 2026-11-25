import { createBackup, MAX_BACKUP_CHARS, readBackup } from '../backup';
import { budgetData, category, expense, recurring } from '@/test-utils/data';

const roundTrip = (data: object) => readBackup(JSON.stringify(data));

function errorOf(result: ReturnType<typeof readBackup>): string {
  if (result.ok) throw new Error('expected the backup to be refused');
  return result.error;
}

describe('createBackup and readBackup', () => {
  it('round-trips everything', () => {
    const data = budgetData({ recurring: [recurring({ lastAdded: '2026-10-31' })], periodStartDay: 25, theme: 'dark' });
    const result = roundTrip(createBackup(data, new Date('2026-11-25T10:00:00Z')));
    expect(result).toEqual({ ok: true, data, legacy: false });
  });

  it('refuses text that is not JSON, or JSON from something else', () => {
    expect(errorOf(readBackup('not json'))).toMatch(/isn't valid JSON/);
    expect(errorOf(readBackup('[]'))).toMatch(/isn't a Budget Tracker backup/);
    expect(errorOf(readBackup('{"app":"other"}'))).toMatch(/isn't a Budget Tracker backup/);
    expect(errorOf(roundTrip({ ...createBackup(budgetData()), version: 3 }))).toMatch(/newer version/);
  });

  it('refuses files that are too large before parsing them', () => {
    expect(errorOf(readBackup(' '.repeat(MAX_BACKUP_CHARS + 1)))).toMatch(/too large/);
  });
});

describe('readBackup checks every field (regression: any JSON with a categories list was accepted)', () => {
  const backup = (overrides: object) => ({ ...createBackup(budgetData()), ...overrides });

  it.each([
    ['a string amount', { expenses: [expense({ amount: '12' as unknown as number })] }, /Expense 1 has an amount/],
    ['a decimal amount', { expenses: [expense({ amount: 12.5 })] }, /Expense 1 has an amount/],
    ['a negative amount', { expenses: [expense({ amount: -5 })] }, /Expense 1 has an amount/],
    ['a zero amount', { expenses: [expense({ amount: 0 })] }, /Expense 1 has an amount/],
    ['a huge amount', { expenses: [expense({ amount: 1e16 })] }, /Expense 1 has an amount/],
    ['an impossible date', { expenses: [expense({ date: '2026-02-30' })] }, /Expense 1 has a date/],
    ['a date with a time', { expenses: [expense({ date: '2026-11-20T10:00:00Z' })] }, /Expense 1 has a date/],
    ['an unknown category', { expenses: [expense({ categoryId: 'ghost' })] }, /category that isn't in the backup/],
    ['a path in an id', { expenses: [expense({ id: '../../x' })] }, /unusual id/],
    ['a duplicate id', { expenses: [expense({ id: 'x' }), expense({ id: 'x' })] }, /share the id "x"/],
    ['tags that are not a list', { expenses: [expense({ tags: 'a,b' as unknown as string[] })] }, /tags/],
    ['a very long note', { expenses: [expense({ notes: 'x'.repeat(301) })] }, /longer than 300/],
    ['a nameless category', { categories: [category({ name: '  ' })] }, /name is empty/],
    ['a category without a budget', { categories: [category({ budgets: [] })] }, /has no budget/],
    ['an unsorted budget history', { categories: [category({ budgets: [{ from: '2026-05', amount: 1 }, { from: '2026-02', amount: 2 }] })] }, /budget history/],
    ['an unknown currency', { currency: 'XYZ' }, /currency/],
    ['an unknown repeat', { recurring: [recurring({ frequency: 'daily' as never })] }, /repeat that isn't valid/],
    ['categories that are not a list', { categories: {} }, /not a list/],
  ])('refuses %s', (_what, overrides, message) => {
    expect(errorOf(roundTrip(backup(overrides)))).toMatch(message);
  });

  it('replaces unknown colours and icons instead of refusing the file', () => {
    const result = roundTrip(backup({ categories: [category({ color: 'url(javascript:alert(1))', icon: 'skull' })] }));
    expect(result.ok && result.data.categories[0]).toMatchObject({ color: '#3B82F6', icon: 'tag' });
  });

  it('ignores fields it does not know, "__proto__" included', () => {
    const text = JSON.stringify(backup({ extra: 1 })).replace(/^\{/, '{"__proto__":{"polluted":true},');
    const result = readBackup(text);
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.ok && Object.keys(result.data).sort()).toEqual(['categories', 'currency', 'expenses', 'periodStartDay', 'recurring', 'theme']);
  });
});

describe('exports from the first version of the app', () => {
  const legacy = {
    version: 1,
    exportedAt: '2026-06-25T10:00:00.000Z',
    categories: [
      { id: 'mcbxk1a2b3', name: 'Groceries', budget: 100.5, color: '#22C55E', icon: 'shopping-cart', createdAt: '2026-06-25T09:00:00.000Z', lastResetAt: '2026-06-25T09:30:00.000Z', pinned: true },
    ],
    expenses: [
      { id: 'mcbxk9z8y7', categoryId: 'mcbxk1a2b3', amount: 12.345, merchant: 'Carrefour', notes: '', tags: ['weekly'], date: '2026-06-25', createdAt: '2026-06-25T10:00:00.000Z' },
      { id: 'mcbxk9z8y8', categoryId: 'mcbxk1a2b3', amount: 0.1, merchant: '', notes: '', tags: [], date: 'not-a-date', createdAt: '2026-06-26T08:00:00.000Z' },
    ],
    events: [{ id: 'v', categoryId: 'mcbxk1a2b3', type: 'all_reset', description: 'x', createdAt: '2026-06-25T09:30:00.000Z' }],
    settings: { currency: 'JOD' },
  };

  it('converts decimal amounts exactly and keeps categories and expenses', () => {
    const result = roundTrip(legacy);
    if (!result.ok) throw new Error(result.error);
    expect(result.legacy).toBe(true);
    expect(result.data.currency).toBe('JOD');
    expect(result.data.categories[0]).toMatchObject({ name: 'Groceries', budgets: [{ from: '2026-06', amount: 100500 }], pinned: true });
    expect(result.data.expenses.map(e => [e.amount, e.date, e.tags])).toEqual([
      [12345, '2026-06-25', ['weekly']],
      [100, '2026-06-26', []],
    ]);
    expect(result.data.recurring).toEqual([]);
  });

  it('refuses an old export with a broken amount', () => {
    expect(errorOf(roundTrip({ ...legacy, expenses: [{ ...legacy.expenses[0], amount: 'lots' }] }))).toMatch(/Expense 1 has an amount/);
  });
});
