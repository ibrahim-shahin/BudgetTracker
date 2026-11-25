import { budgetFor, categoryMonths, expensesInPeriod, merchantTotals, totals, withBudgetFrom } from '../budget';
import { category, expense } from '@/test-utils/data';

describe('budget history', () => {
  const groceries = category({
    budgets: [
      { from: '2026-03', amount: 100000 },
      { from: '2026-06', amount: 150000 },
    ],
  });

  it('gives each month the budget it had then', () => {
    expect(budgetFor(groceries, '2026-03')).toBe(100000);
    expect(budgetFor(groceries, '2026-05')).toBe(100000);
    expect(budgetFor(groceries, '2026-06')).toBe(150000);
    expect(budgetFor(groceries, '2027-01')).toBe(150000);
  });

  it('uses the first budget for months before it was set', () => {
    expect(budgetFor(groceries, '2025-12')).toBe(100000);
  });

  it('changes the budget from a month onwards and keeps earlier months', () => {
    expect(withBudgetFrom(groceries.budgets, '2026-09', 175000)).toEqual([
      { from: '2026-03', amount: 100000 },
      { from: '2026-06', amount: 150000 },
      { from: '2026-09', amount: 175000 },
    ]);
    expect(withBudgetFrom(groceries.budgets, '2026-06', 120000)).toEqual([
      { from: '2026-03', amount: 100000 },
      { from: '2026-06', amount: 120000 },
    ]);
  });

  it("drops a change that sets the budget back to the previous month's", () => {
    expect(withBudgetFrom(groceries.budgets, '2026-06', 100000)).toEqual([{ from: '2026-03', amount: 100000 }]);
    expect(withBudgetFrom(groceries.budgets, '2026-09', 150000)).toEqual(groceries.budgets);
  });
});

describe('a budget month', () => {
  const food = category({ id: 'food', budgets: [{ from: '2026-01', amount: 100000 }] });
  const fun = category({ id: 'fun', name: 'Fun', budgets: [{ from: '2026-01', amount: 0 }] });
  const all = [
    expense({ id: 'a', categoryId: 'food', amount: 60000, date: '2026-11-01' }),
    expense({ id: 'b', categoryId: 'food', amount: 50000, date: '2026-11-30' }),
    expense({ id: 'c', categoryId: 'fun', amount: 7000, date: '2026-11-15' }),
    expense({ id: 'd', categoryId: 'food', amount: 99999, date: '2026-12-01' }),
    expense({ id: 'e', categoryId: 'food', amount: 99999, date: '2026-10-31' }),
  ];

  it('counts expenses from the first to the last day of the month only', () => {
    expect(expensesInPeriod(all, '2026-11', 1).map(e => e.id)).toEqual(['a', 'b', 'c']);
    expect(expensesInPeriod(all, '2026-10', 25).map(e => e.id)).toEqual(['a', 'c', 'e']);
  });

  it('adds up spending per category and overall, exactly', () => {
    const rows = categoryMonths([food, fun], expensesInPeriod(all, '2026-11', 1), '2026-11');
    expect(rows.map(r => [r.category.id, r.budget, r.spent, r.remaining, r.count, r.lastDate])).toEqual([
      ['food', 100000, 110000, -10000, 2, '2026-11-30'],
      ['fun', 0, 7000, -7000, 1, '2026-11-15'],
    ]);
    // A category without a budget doesn't count as overspent.
    expect(totals(rows)).toEqual({ budget: 100000, spent: 117000, remaining: -17000, overspent: 1 });
  });
});

describe('merchantTotals', () => {
  it('merges merchants typed differently and keeps the latest spelling', () => {
    const rows = merchantTotals([
      expense({ merchant: 'carrefour', amount: 1000, date: '2026-11-01' }),
      expense({ merchant: 'Carrefour ', amount: 2000, date: '2026-11-03' }),
      expense({ merchant: 'Café Rio', amount: 5000 }),
      expense({ merchant: 'Cafe rio', amount: 500, date: '2026-11-01' }),
      expense({ merchant: '', amount: 9000 }),
    ]);
    expect(rows).toEqual([
      { name: 'Café Rio', total: 5500, count: 2 },
      { name: 'Carrefour', total: 3000, count: 2 },
    ]);
  });
});
