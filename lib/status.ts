/**
 * Status derivation. Status is ALWAYS derived from dates, never stored.
 *
 *   INCOMPLETE : not received AND missing the sent date or expected-return date
 *                (e.g. entered before a delivery date is known, or made but not
 *                yet paid for / sent). Surfaced prominently so it isn't lost.
 *   OVERDUE    : expected_return_date < today AND not received
 *   DUE_SOON   : expected_return_date within the next 3 business days AND not received
 *   ON_TRACK   : not yet received, expected further out
 *   RECEIVED   : has a received_date
 */

import { addBusinessDays, diffInDays, today as todayUtc, toUtcMidnight } from "./dates";

export type ApplianceStatus =
  | "INCOMPLETE"
  | "OVERDUE"
  | "DUE_SOON"
  | "ON_TRACK"
  | "RECEIVED";

export interface StatusInput {
  dateSent?: Date | null;
  expectedReturnDate?: Date | null;
  receivedDate?: Date | null;
}

export function deriveStatus(
  input: StatusInput,
  now: Date = todayUtc()
): ApplianceStatus {
  const today = toUtcMidnight(now);
  if (input.receivedDate) return "RECEIVED";

  // Missing a key date means the case can't be placed on the return timeline.
  if (!input.dateSent || !input.expectedReturnDate) return "INCOMPLETE";

  const expected = toUtcMidnight(input.expectedReturnDate);
  if (diffInDays(expected, today) < 0) return "OVERDUE";

  const dueSoonCutoff = addBusinessDays(today, 3);
  // Due soon = expected is today..cutoff (inclusive).
  if (diffInDays(expected, dueSoonCutoff) <= 0) return "DUE_SOON";

  return "ON_TRACK";
}

/** Whole days overdue (positive). 0 if not overdue or no expected date. */
export function daysOverdue(
  expectedReturnDate: Date | null | undefined,
  now: Date = todayUtc()
): number {
  if (!expectedReturnDate) return 0;
  const d = diffInDays(toUtcMidnight(now), toUtcMidnight(expectedReturnDate));
  return d > 0 ? d : 0;
}

/** A received appliance that arrived after its expected date is "late". */
export function isLateArrival(
  expectedReturnDate: Date | null | undefined,
  receivedDate?: Date | null
): boolean {
  if (!receivedDate || !expectedReturnDate) return false;
  return diffInDays(toUtcMidnight(receivedDate), toUtcMidnight(expectedReturnDate)) > 0;
}

export const STATUS_META: Record<
  ApplianceStatus,
  { label: string; emoji: string }
> = {
  INCOMPLETE: { label: "Incomplete", emoji: "📝" },
  OVERDUE: { label: "Overdue", emoji: "🔴" },
  DUE_SOON: { label: "Due Soon", emoji: "🟡" },
  ON_TRACK: { label: "On Track", emoji: "🟢" },
  RECEIVED: { label: "Received", emoji: "✅" },
};
