/**
 * Parser for "DD" (delivery date) patterns embedded in free-text notes from
 * the legacy spreadsheet.
 *
 * Valid examples:  "DD 7/9", "DD7/9", "DD 6/25", "dd7/24"
 * Typo examples:   "DD723"  (no slash)  -> flag for manual review
 *
 * The year is inferred from the sheet name (e.g. "June26" -> 2026).
 *
 * Pure functions. Unit tested in ddParser.test.ts.
 */

import { utcDate } from "./dates";

export interface DdParseResult {
  /** Did we find anything that looks like a DD reference at all? */
  found: boolean;
  /** Parsed delivery date, if confidently parsed. */
  date: Date | null;
  month: number | null;
  day: number | null;
  /** True when something DD-ish was found but couldn't be parsed cleanly. */
  needsReview: boolean;
  /** Reason the row needs review (when applicable). */
  reviewReason: string | null;
  /** The raw substring we matched on. */
  raw: string | null;
}

const MONTH_NAME_TO_NUM: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/**
 * Infer a 4-digit year from a sheet name like "June26", "June 2026",
 * "Jun26", "06-26". Falls back to the provided default year.
 */
export function inferYearFromSheetName(
  sheetName: string,
  fallbackYear: number
): number {
  // Look for a 4-digit year first.
  const four = sheetName.match(/(19|20)\d{2}/);
  if (four) return parseInt(four[0], 10);

  // Otherwise look for a trailing 2-digit year (e.g. "June26").
  const two = sheetName.match(/(\d{2})\s*$/);
  if (two) return 2000 + parseInt(two[1], 10);

  return fallbackYear;
}

/**
 * Infer the month a sheet represents from its name (e.g. "June26" -> 6).
 * Returns null if no month name is present.
 */
export function inferMonthFromSheetName(sheetName: string): number | null {
  const lower = sheetName.toLowerCase();
  for (const key of Object.keys(MONTH_NAME_TO_NUM)) {
    if (lower.startsWith(key)) return MONTH_NAME_TO_NUM[key];
  }
  return null;
}

function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

/**
 * Parse a DD reference out of a notes string. `year` is the inferred year for
 * the sheet being imported.
 */
export function parseDeliveryDateFromNotes(
  notes: string | null | undefined,
  year: number
): DdParseResult {
  const empty: DdParseResult = {
    found: false,
    date: null,
    month: null,
    day: null,
    needsReview: false,
    reviewReason: null,
    raw: null,
  };

  if (!notes) return empty;

  // Preferred: DD followed by M/D (slash separated), spaces optional.
  const slashMatch = notes.match(/dd\s*(\d{1,2})\s*\/\s*(\d{1,2})/i);
  if (slashMatch) {
    const month = parseInt(slashMatch[1], 10);
    const day = parseInt(slashMatch[2], 10);
    const raw = slashMatch[0];
    if (isValidMonthDay(month, day)) {
      return {
        found: true,
        date: utcDate(year, month, day),
        month,
        day,
        needsReview: false,
        reviewReason: null,
        raw,
      };
    }
    return {
      found: true,
      date: null,
      month,
      day,
      needsReview: true,
      reviewReason: `Parsed "${raw}" but ${month}/${day} is not a valid date.`,
      raw,
    };
  }

  // Fallback: "DD" followed by digits with no slash (typo like "DD723").
  const digitsMatch = notes.match(/dd\s*(\d{3,4})\b/i);
  if (digitsMatch) {
    const digits = digitsMatch[1];
    const raw = digitsMatch[0];
    const guess = guessFromRunOfDigits(digits, year);
    return {
      found: true,
      date: guess?.date ?? null,
      month: guess?.month ?? null,
      day: guess?.day ?? null,
      needsReview: true,
      reviewReason: `Found "${raw}" without a slash${
        guess ? ` — guessed ${guess.month}/${guess.day}` : ""
      }. Please confirm.`,
      raw,
    };
  }

  // A bare "DD" with nothing usable after it.
  const bareMatch = notes.match(/\bdd\b/i);
  if (bareMatch) {
    return {
      found: true,
      date: null,
      month: null,
      day: null,
      needsReview: true,
      reviewReason: `Found "DD" but no date after it.`,
      raw: bareMatch[0],
    };
  }

  return empty;
}

/**
 * Best-effort guess for a run of 3–4 digits like "723" -> 7/23, "1105" ->
 * 11/05. Returns null if no interpretation is valid. Always needs review.
 */
function guessFromRunOfDigits(
  digits: string,
  year: number
): { month: number; day: number; date: Date } | null {
  const candidates: Array<[number, number]> = [];
  if (digits.length === 3) {
    // M DD  (e.g. 723 -> 7/23)
    candidates.push([parseInt(digits[0], 10), parseInt(digits.slice(1), 10)]);
    // MM D  (e.g. 110 -> 11/0 invalid, but try anyway)
    candidates.push([parseInt(digits.slice(0, 2), 10), parseInt(digits[2], 10)]);
  } else if (digits.length === 4) {
    // MM DD (e.g. 1105 -> 11/05)
    candidates.push([
      parseInt(digits.slice(0, 2), 10),
      parseInt(digits.slice(2), 10),
    ]);
    // M DDD is nonsense; skip.
  }
  for (const [month, day] of candidates) {
    if (isValidMonthDay(month, day)) {
      return { month, day, date: utcDate(year, month, day) };
    }
  }
  return null;
}
