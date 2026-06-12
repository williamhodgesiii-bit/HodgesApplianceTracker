/**
 * Core business rule: the expected return date.
 *
 * Default rule: expected_return_date = delivery_date minus LEAD_DAYS calendar
 * days. This is the date the office expects the appliance back from the lab,
 * leaving a buffer before the patient's delivery (DD) appointment.
 *
 * The value is only a suggested default — it can always be entered or adjusted
 * by hand on the Add/Edit form.
 *
 * Pure function. Unit tested in expectedReturn.test.ts.
 */

import { addDays, isWeekend, weekdayName } from "./dates";

/** How many days before delivery we expect the appliance back by default. */
export const DEFAULT_LEAD_DAYS = 4;

/** Roll a date forward (toward the future) until it is a weekday (Mon–Fri). */
export function rollForwardToBusinessDay(date: Date): Date {
  let d = date;
  while (isWeekend(d)) {
    d = addDays(d, 1);
  }
  return d;
}

export interface ExpectedReturnResult {
  /** The computed expected return date (UTC midnight). */
  date: Date;
  /** Days before delivery used for the calculation. */
  leadDays: number;
  /** Whether the raw minus-leadDays date fell on a weekend and was moved. */
  movedToMonday: boolean;
  /** Weekday the expected date lands on. */
  finalWeekday: string;
  /** Human-friendly explanation of the rule applied. */
  explanation: string;
}

/**
 * Compute the suggested expected return date and an explanation of the rule.
 *
 * Default = delivery minus `leadDays` calendar days. If that lands on a
 * weekend it is moved forward to the following Monday.
 */
export function computeExpectedReturn(
  deliveryDate: Date,
  leadDays: number = DEFAULT_LEAD_DAYS
): ExpectedReturnResult {
  const raw = addDays(deliveryDate, -leadDays);
  const movedToMonday = isWeekend(raw);
  const date = rollForwardToBusinessDay(raw);
  const finalWeekday = weekdayName(date);
  const explanation = movedToMonday
    ? `Auto: ${leadDays} days before delivery landed on a weekend — moved to ${finalWeekday}.`
    : `Auto: ${leadDays} days before delivery (lands on ${finalWeekday}).`;
  return { date, leadDays, movedToMonday, finalWeekday, explanation };
}

/** Convenience: just the date. */
export function expectedReturnDate(
  deliveryDate: Date,
  leadDays: number = DEFAULT_LEAD_DAYS
): Date {
  return computeExpectedReturn(deliveryDate, leadDays).date;
}
