import { expensesCsv, plainAmount } from '../exportCsv';
import { category, expense } from '@/test-utils/data';

it('writes amounts without grouping so spreadsheets read numbers', () => {
  expect(plainAmount(123456789, 3)).toBe('123456.789');
  expect(plainAmount(5, 2)).toBe('0.05');
  expect(plainAmount(42, 0)).toBe('42');
});

it('lists expenses oldest first with their category and tags', () => {
  const csv = expensesCsv(
    [expense({ id: 'b', date: '2026-11-21', amount: 2000, tags: ['a', 'b'] }), expense({ id: 'a', date: '2026-11-20', amount: 1500, merchant: 'كارفور' })],
    [category({ id: 'food', name: 'Food' })],
    'USD',
  );
  expect(csv.split('\r\n')).toEqual([
    '\uFEFFDate,Category,Amount,Currency,Merchant,Notes,Tags',
    '2026-11-20,Food,15.00,USD,كارفور,,',
    '2026-11-21,Food,20.00,USD,Carrefour,,a; b',
    '',
  ]);
});
