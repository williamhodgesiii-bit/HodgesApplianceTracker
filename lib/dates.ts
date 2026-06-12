/**
 * Timezone-safe date helpers.
 *
 * All business dates (sent, delivery, expected, received) are "calendar
 * dates" with no meaningful time-of-day. To avoid off-by-one bugs caused by
 * local timezones, we always anchor them to UTC midnight and do arithmetic in
 * UTC.
 */

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Build a UTC-midnight Date from year/month(1-12)/day. */
export function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 0, 0, 0, 0));
}

/** Normalize any Date to UTC midnight (drops time-of-day in UTC terms). */
export function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/** Parse an ISO `YYYY-MM-DD` string into a UTC-midnight Date. */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  return utcDate(y, m, d);
}

/** Format a Date as `YYYY-MM-DD` (for <input type="date"> values). */
export function toDateInputValue(date: Date): string {
  const d = toUtcMidnight(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Add (or subtract, with negatives) whole calendar days in UTC. */
export function addDays(date: Date, days: number): Date {
  const d = toUtcMidnight(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** UTC day of week: 0 = Sunday ... 6 = Saturday. */
export function dayOfWeek(date: Date): number {
  return toUtcMidnight(date).getUTCDay();
}

export function isWeekend(date: Date): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

export function weekdayName(date: Date): string {
  return WEEKDAY_NAMES[dayOfWeek(date)];
}

/** Whole-day difference a - b (positive when a is after b). */
export function diffInDays(a: Date, b: Date): number {
  const ms = toUtcMidnight(a).getTime() - toUtcMidnight(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function isSameDay(a: Date, b: Date): boolean {
  return diffInDays(a, b) === 0;
}

/**
 * Add N business days forward from a date (skipping weekends). Used to compute
 * the "due soon" window. The starting date itself is not counted.
 */
export function addBusinessDays(date: Date, businessDays: number): Date {
  let d = toUtcMidnight(date);
  let remaining = businessDays;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) remaining -= 1;
  }
  return d;
}

/**
 * Human-friendly display: "Mon, Jul 7" — weekday always visible because the
 * day of week matters a lot in this workflow.
 */
export function formatDisplay(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = toUtcMidnight(date);
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${
    MONTH_SHORT[d.getUTCMonth()]
  } ${d.getUTCDate()}`;
}

/** Like formatDisplay but with the year, for reports/exports. */
export function formatDisplayWithYear(date: Date | null | undefined): string {
  if (!date) return "—";
  const d = toUtcMidnight(date);
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${
    MONTH_SHORT[d.getUTCMonth()]
  } ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Today, normalized to UTC midnight. */
export function today(): Date {
  return toUtcMidnight(new Date());
}

/** Format a `YYYY-MM-DD` string (or null) as "Mon, Jul 7". */
export function formatInput(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDisplay(parseDateInput(value));
}

/** Format a `YYYY-MM-DD` string (or null) as "Mon, Jul 7, 2026". */
export function formatInputWithYear(value: string | null | undefined): string {
  if (!value) return "—";
  return formatDisplayWithYear(parseDateInput(value));
}

/**
 * Plain-English relative day vs. today: "Today", "Tomorrow", "Yesterday",
 * "in 3 days", "3 days ago". Calendar-day based (no time-of-day).
 */
export function relativeDay(date: Date, ref: Date = today()): string {
  const diff = diffInDays(toUtcMidnight(date), toUtcMidnight(ref));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

/** Like relativeDay but takes a `YYYY-MM-DD` string. Empty input → "". */
export function relativeFromInput(
  value: string | null | undefined,
  ref?: Date
): string {
  if (!value) return "";
  return relativeDay(parseDateInput(value), ref);
}

export { WEEKDAY_NAMES };
