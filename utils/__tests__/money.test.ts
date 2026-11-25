import {
  amountInputValue,
  cleanAmountInput,
  currencyDecimals,
  formatAmount,
  formatMoney,
  isValidMinor,
  maxMinor,
  minorFromDecimal,
  parseAmount,
  percentOf,
  rescaleMinor,
} from '../money';

const ok = (minor: number) => ({ ok: true, minor });

describe('currencyDecimals', () => {
  it('knows the three-decimal dinars and rials', () => {
    expect(currencyDecimals('JOD')).toBe(3);
    expect(currencyDecimals('KWD')).toBe(3);
    expect(currencyDecimals('BHD')).toBe(3);
    expect(currencyDecimals('OMR')).toBe(3);
  });

  it('uses two decimals for the others and for unknown codes', () => {
    expect(currencyDecimals('USD')).toBe(2);
    expect(currencyDecimals('XYZ')).toBe(2);
  });
});

describe('parseAmount', () => {
  it('reads plain amounts into minor units without floating-point error', () => {
    expect(parseAmount('12.345', 3)).toEqual(ok(12345));
    expect(parseAmount('0.1', 3)).toEqual(ok(100));
    expect(parseAmount('0.2', 3)).toEqual(ok(200));
    expect(parseAmount('19.99', 2)).toEqual(ok(1999));
    expect(parseAmount('1.005', 3)).toEqual(ok(1005));
    expect(parseAmount('7', 2)).toEqual(ok(700));
    expect(parseAmount('.5', 3)).toEqual(ok(500));
    expect(parseAmount('5.', 2)).toEqual(ok(500));
    expect(parseAmount('0007.50', 2)).toEqual(ok(750));
  });

  it('reads a lone comma as the decimal point (regression: "1,5" was saved as 1)', () => {
    expect(parseAmount('1,5', 3)).toEqual(ok(1500));
    expect(parseAmount('12,25', 2)).toEqual(ok(1225));
  });

  it('treats the earlier of "," and "." as a thousands separator', () => {
    expect(parseAmount('1,234.50', 2)).toEqual(ok(123450));
    expect(parseAmount('1.234,50', 2)).toEqual(ok(123450));
    expect(parseAmount('1,234,567', 2)).toEqual(ok(123456700));
  });

  it('accepts Arabic-Indic and Persian digits and the Arabic separators', () => {
    expect(parseAmount('١٢٫٥', 3)).toEqual(ok(12500));
    expect(parseAmount('۱۲۳', 2)).toEqual(ok(12300));
    expect(parseAmount('١٬٢٣٤٫٥٠٠', 3)).toEqual(ok(1234500));
    expect(parseAmount(' 12 ', 2)).toEqual(ok(1200));
  });

  it('refuses extra decimals instead of rounding them, but allows extra zeros', () => {
    expect(parseAmount('12.345', 2)).toEqual({ ok: false, error: 'too-many-decimals' });
    expect(parseAmount('12.5', 0)).toEqual({ ok: false, error: 'too-many-decimals' });
    expect(parseAmount('12.500', 2)).toEqual(ok(1250));
  });

  it('refuses text, signs, exponents and repeated points (regression: "12.3.4" was saved as 12.3)', () => {
    for (const text of ['abc', '12.3.4', '-5', '+5', '1e5', '.', '12a', '0x10', 'NaN', 'Infinity']) {
      expect(parseAmount(text, 2)).toEqual({ ok: false, error: 'invalid' });
    }
    expect(parseAmount('', 2)).toEqual({ ok: false, error: 'empty' });
    expect(parseAmount('   ', 2)).toEqual({ ok: false, error: 'empty' });
  });

  it('refuses amounts above the limit', () => {
    expect(parseAmount('999999999.999', 3)).toEqual(ok(maxMinor(3)));
    expect(parseAmount('1000000000', 3)).toEqual({ ok: false, error: 'too-large' });
    expect(parseAmount('99999999999999999999', 2)).toEqual({ ok: false, error: 'too-large' });
  });

  it('keeps sums exact (regression: 0.1 + 0.2 was 0.30000000000000004)', () => {
    const a = parseAmount('0.1', 3);
    const b = parseAmount('0.2', 3);
    if (!a.ok || !b.ok) throw new Error('parse failed');
    expect(formatAmount(a.minor + b.minor, 3)).toBe('0.300');
  });
});

describe('cleanAmountInput', () => {
  it('converts Arabic digits and separators while typing', () => {
    expect(cleanAmountInput('١٢٫٥', 3)).toBe('12.5');
    expect(cleanAmountInput('12,5', 2)).toBe('12.5');
  });

  it('keeps one decimal point and at most the currency decimals', () => {
    expect(cleanAmountInput('1.2.3', 3)).toBe('1.23');
    expect(cleanAmountInput('12.3456', 3)).toBe('12.345');
    expect(cleanAmountInput('12.3456', 2)).toBe('12.34');
    expect(cleanAmountInput('12.5', 0)).toBe('12');
  });

  it('drops letters, signs and spaces', () => {
    expect(cleanAmountInput('-1a2 b', 2)).toBe('12');
  });
});

describe('formatAmount and formatMoney', () => {
  it('shows every decimal of the currency (regression: JOD showed 2 decimals)', () => {
    expect(formatMoney(12345, 'JOD')).toBe('JOD 12.345');
    expect(formatMoney(100500, 'JOD')).toBe('JOD 100.500');
    expect(formatMoney(1999, 'USD')).toBe('USD 19.99');
  });

  it('never rounds a total to whole units (regression: 100.50 showed as "JOD 101")', () => {
    expect(formatMoney(100500, 'JOD')).not.toContain('101');
  });

  it('groups thousands and pads small amounts', () => {
    expect(formatAmount(123456789, 3)).toBe('123,456.789');
    expect(formatAmount(5, 3)).toBe('0.005');
    expect(formatAmount(0, 2)).toBe('0.00');
    expect(formatAmount(1234, 0)).toBe('1,234');
  });

  it('marks amounts below zero with a minus sign', () => {
    expect(formatMoney(-3000, 'JOD')).toBe('−JOD 3.000');
    expect(formatAmount(-1250, 2)).toBe('−12.50');
  });
});

describe('amountInputValue', () => {
  it('writes the amount back as the user would type it', () => {
    expect(amountInputValue(12500, 3)).toBe('12.5');
    expect(amountInputValue(12000, 3)).toBe('12');
    expect(amountInputValue(12345, 3)).toBe('12.345');
    expect(amountInputValue(5, 2)).toBe('0.05');
    expect(amountInputValue(7, 0)).toBe('7');
  });

  it('round-trips through parseAmount', () => {
    for (const minor of [1, 10, 999, 12345, 100000, maxMinor(3)]) {
      expect(parseAmount(amountInputValue(minor, 3), 3)).toEqual(ok(minor));
    }
  });
});

describe('rescaleMinor', () => {
  it('adds a decimal exactly', () => {
    expect(rescaleMinor(1250, 2, 3)).toEqual({ minor: 12500, exact: true });
  });

  it('removes a decimal, rounding halves up and saying so', () => {
    expect(rescaleMinor(12340, 3, 2)).toEqual({ minor: 1234, exact: true });
    expect(rescaleMinor(12345, 3, 2)).toEqual({ minor: 1235, exact: false });
    expect(rescaleMinor(12344, 3, 2)).toEqual({ minor: 1234, exact: false });
    expect(rescaleMinor(-12345, 3, 2)).toEqual({ minor: -1235, exact: false });
  });
});

describe('minorFromDecimal', () => {
  it('reads old decimal amounts as written', () => {
    expect(minorFromDecimal(12.35, 2)).toBe(1235);
    expect(minorFromDecimal(1.005, 3)).toBe(1005);
    expect(minorFromDecimal(0.1 + 0.2, 3)).toBe(300);
    expect(minorFromDecimal(100.5, 3)).toBe(100500);
  });

  it('refuses negative, missing and huge amounts', () => {
    expect(minorFromDecimal(-1, 2)).toBeNull();
    expect(minorFromDecimal(Number.NaN, 2)).toBeNull();
    expect(minorFromDecimal(1e12, 3)).toBeNull();
  });
});

describe('isValidMinor and percentOf', () => {
  it('accepts only whole, non-negative amounts within the limit', () => {
    expect(isValidMinor(0, 3)).toBe(true);
    expect(isValidMinor(maxMinor(3), 3)).toBe(true);
    expect(isValidMinor(maxMinor(3) + 1, 3)).toBe(false);
    expect(isValidMinor(1.5, 3)).toBe(false);
    expect(isValidMinor(-1, 3)).toBe(false);
    expect(isValidMinor('12', 3)).toBe(false);
  });

  it('rounds percentages and copes with no budget', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(150, 100)).toBe(150);
    expect(percentOf(5, 0)).toBe(0);
  });
});
