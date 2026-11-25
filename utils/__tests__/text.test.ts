import { countOf } from '../text';

it('uses the singular only for exactly one', () => {
  expect(countOf(1, 'category', 'categories')).toBe('1 category');
  expect(countOf(0, 'expense', 'expenses')).toBe('0 expenses');
  expect(countOf(28, 'expense', 'expenses')).toBe('28 expenses');
});
