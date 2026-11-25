import { matchesWords, normalizeForSearch, searchWords } from '../search';

describe('normalizeForSearch', () => {
  it('ignores case and accents', () => {
    expect(normalizeForSearch('  Café CRÈME ')).toBe('cafe creme');
  });

  it('folds Arabic letter variants and removes vowel marks and tatweel', () => {
    expect(normalizeForSearch('أرز')).toBe('ارز');
    expect(normalizeForSearch('إبرة')).toBe('ابره');
    expect(normalizeForSearch('مستشفى')).toBe('مستشفي');
    expect(normalizeForSearch('شَاي')).toBe('شاي');
    expect(normalizeForSearch('شـاي')).toBe('شاي');
  });

  it('reads Arabic-Indic and Persian digits as 0-9', () => {
    expect(normalizeForSearch('١٢٫٥ ۳')).toBe('12.5 3');
  });
});

describe('matchesWords', () => {
  const fields = ['Carrefour', 'Weekly shop, milk and bread', 'groceries', 'Food'];

  it('matches everything for an empty search', () => {
    expect(matchesWords(searchWords('   '), fields)).toBe(true);
  });

  it('needs every word, in any field and order', () => {
    expect(matchesWords(searchWords('bread carre'), fields)).toBe(true);
    expect(matchesWords(searchWords('bread rice'), fields)).toBe(false);
  });

  it('finds Arabic text however it is spelt', () => {
    expect(matchesWords(searchWords('صيدليه'), ['صيدلية الأمل'])).toBe(true);
    expect(matchesWords(searchWords('الامل'), ['صيدلية الأمل'])).toBe(true);
  });
});
