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

import { addDays, weekdayName } from "./dates";

/** How many days before delivery we expect the appliance back by default. */
export const DEFAULT_LEAD_DAYS = 4;

export interface ExpectedReturnResult {
  /** The computed expected return date (UTC midnight). */
  date: Date;
  /** Days before delivery used for the calculation. */
  leadDays: number;
  /** Weekday the expected date lands on. */
  finalWeekday: string;
  /** Human-friendly explanation of the rule applied. */
  explanation: string;
}

/**
 * Compute the suggested expected return date and an explanation of the rule.
 */
export function computeExpectedReturn(
  deliveryDate: Date,
  leadDays: number = DEFAULT_LEAD_DAYS
): ExpectedReturnResult {
  const date = addDays(deliveryDate, -leadDays);
  const finalWeekday = weekdayName(date);
  const explanation = `Auto: ${leadDays} days before delivery (lands on ${finalWeekday}).`;
  return { date, leadDays, finalWeekday, explanation };
}

/** Convenience: just the date. */
export function expectedReturnDate(
  deliveryDate: Date,
  leadDays: number = DEFAULT_LEAD_DAYS
): Date {
  return computeExpectedReturn(deliveryDate, leadDays).date;
}
