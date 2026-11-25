// Search that ignores case, accents and Arabic spelling variants.
// Adapted from Home Stock (utils/search.ts).

// Marks left after NFKD decomposition: Latin accents (U+0300-036F) and
// Arabic vowel and Quranic marks (U+0610-061A, U+064B-065F, U+0670, U+06D6-06ED).
const COMBINING_MARKS = /[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const TATWEEL = /\u0640/g;

/**
 * Text as search compares it: lowercase, without accents or Arabic vowel
 * marks, with Arabic letter variants folded and Arabic-Indic digits as 0-9.
 * NFKD already turns hamza forms such as أ إ آ into their base letters.
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(TATWEEL, '')
    .replace(/ٱ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .toLocaleLowerCase()
    .trim();
}

/** The query's words, normalised; empty when there is nothing to search for. */
export function searchWords(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

/** True when every word appears somewhere in the given fields. */
export function matchesWords(words: string[], fields: string[]): boolean {
  if (words.length === 0) return true;
  const text = normalizeForSearch(fields.join(' '));
  return words.every(word => text.includes(word));
}
