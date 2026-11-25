// CSV for spreadsheets (RFC 4180), safe to open in Excel, Numbers or Sheets.

// A cell starting with one of these is read as a formula by spreadsheet apps,
// so a merchant called "=HYPERLINK(...)" could run when the file is opened.
const FORMULA_START = /^[=+\-@\t\r]/;

/** One cell: quoted when needed, with formula-like text defused by a leading apostrophe. */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows joined with CRLF. The byte-order mark makes Excel read the file as
 * UTF-8, so Arabic text shows correctly.
 */
export function toCsv(rows: (string | number)[][]): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
