import { csvCell, toCsv } from '../csv';

describe('csvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvCell('Carrefour')).toBe('Carrefour');
    expect(csvCell('12.345')).toBe('12.345');
    expect(csvCell(42)).toBe('42');
  });

  it('quotes commas, quotes and line breaks (regression: they broke the columns)', () => {
    expect(csvCell('Bread, milk')).toBe('"Bread, milk"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
    expect(csvCell(' padded ')).toBe('" padded "');
  });

  it('defuses text a spreadsheet would run as a formula (regression: CSV formula injection)', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvCell('+1-2')).toBe("'+1-2");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\tcmd')).toBe("'\tcmd");
  });
});

describe('toCsv', () => {
  it('writes a UTF-8 file with CRLF lines that keeps Arabic text', () => {
    expect(toCsv([['Date', 'Merchant'], ['2026-11-25', 'كارفور']])).toBe('\uFEFFDate,Merchant\r\n2026-11-25,كارفور\r\n');
  });
});
