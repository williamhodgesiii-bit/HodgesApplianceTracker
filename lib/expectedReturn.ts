/**
 * Core business rule: the expected return date.
 *
 * expected_return_date = delivery_date minus 3 calendar days, then adjusted
 * BACKWARD so it always lands on a business day (Mon–Fri).
 *
 * Examples (from the spec):
 *   DD = Fri Jul 10  -> minus 3 = Tue Jul 7  (weekday)          -> Tue Jul 7
 *   DD = Monday      -> minus 3 = Friday (prev week)            -> that Friday
 *   DD = Tuesday     -> minus 3 = Saturday -> roll back         -> Friday
 *   DD = Wednesday   -> minus 3 = Sunday   -> roll back         -> Friday
 *
 * Pure function. Unit tested in expectedReturn.test.ts.
 */

import { addDays, dayOfWeek, isWeekend, weekdayName } from "./dates";

export interface ExpectedReturnResult {
  /** The computed expected return date (UTC midnight). */
  date: Date;
  /** Whether the minus-3 landed on a weekend and had to roll back. */
  rolledBack: boolean;
  /** Weekday the minus-3 calculation initially landed on. */
  landedOn: string;
  /** Final weekday after any roll-back. */
  finalWeekday: string;
  /** Human-friendly explanation of the rule applied. */
  explanation: string;
}

/** Roll a date backward (toward the past) until it is a weekday. */
export function rollBackToBusinessDay(date: Date): Date {
  let d = date;
  while (isWeekend(d)) {
    d = addDays(d, -1);
  }
  return d;
}

/**
 * Compute the expected return date and an explanation of the rule applied.
 */
export function computeExpectedReturn(deliveryDate: Date): ExpectedReturnResult {
  const minusThree = addDays(deliveryDate, -3);
  const landedDow = dayOfWeek(minusThree);
  const landedOn = weekdayName(minusThree);
  const rolledBack = isWeekend(minusThree);
  const date = rollBackToBusinessDay(minusThree);
  const finalWeekday = weekdayName(date);

  let explanation: string;
  if (!rolledBack) {
    explanation = `Delivery minus 3 days lands on ${landedOn} (a business day) — no adjustment needed.`;
  } else {
    explanation = `Delivery minus 3 days lands on ${landedOn}; rolled back to ${finalWeekday}.`;
  }

  return { date, rolledBack, landedOn, finalWeekday, explanation };
}

/** Convenience: just the date. */
export function expectedReturnDate(deliveryDate: Date): Date {
  return computeExpectedReturn(deliveryDate).date;
}

export { dayOfWeek as _dayOfWeek };
