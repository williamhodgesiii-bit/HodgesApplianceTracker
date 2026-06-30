import { describe, it, expect } from "vitest";
import {
  deriveStatus,
  daysOverdue,
  isLateArrival,
} from "./status";
import { utcDate } from "./dates";

// Anchor "now" to a Wednesday for deterministic tests.
const NOW = utcDate(2026, 7, 8); // Wed Jul 8, 2026
// A sent date in the past so timeline cases aren't flagged INCOMPLETE.
const SENT = utcDate(2026, 7, 1);

describe("deriveStatus", () => {
  it("RECEIVED when received_date is set, regardless of dates", () => {
    expect(
      deriveStatus(
        { expectedReturnDate: utcDate(2026, 1, 1), receivedDate: utcDate(2026, 7, 1) },
        NOW
      )
    ).toBe("RECEIVED");
  });

  it("INCOMPLETE when not received and there is no expected date", () => {
    expect(deriveStatus({ dateSent: SENT }, NOW)).toBe("INCOMPLETE");
  });

  it("INCOMPLETE when not received and there is no sent date", () => {
    expect(
      deriveStatus({ expectedReturnDate: utcDate(2026, 7, 14) }, NOW)
    ).toBe("INCOMPLETE");
  });

  it("INCOMPLETE when nothing but patient info is known", () => {
    expect(deriveStatus({}, NOW)).toBe("INCOMPLETE");
  });

  it("OVERDUE when expected < today and not received", () => {
    expect(
      deriveStatus({ dateSent: SENT, expectedReturnDate: utcDate(2026, 7, 7) }, NOW)
    ).toBe("OVERDUE");
  });

  it("DUE_SOON when expected is today", () => {
    expect(
      deriveStatus({ dateSent: SENT, expectedReturnDate: utcDate(2026, 7, 8) }, NOW)
    ).toBe("DUE_SOON");
  });

  it("DUE_SOON when expected within next 3 business days", () => {
    // Wed Jul 8 + 3 business days = Mon Jul 13.
    expect(
      deriveStatus({ dateSent: SENT, expectedReturnDate: utcDate(2026, 7, 13) }, NOW)
    ).toBe("DUE_SOON");
  });

  it("ON_TRACK when expected beyond the 3-business-day window", () => {
    expect(
      deriveStatus({ dateSent: SENT, expectedReturnDate: utcDate(2026, 7, 14) }, NOW)
    ).toBe("ON_TRACK");
  });
});

describe("daysOverdue", () => {
  it("counts whole days overdue", () => {
    expect(daysOverdue(utcDate(2026, 7, 5), NOW)).toBe(3);
  });
  it("is 0 when not overdue", () => {
    expect(daysOverdue(utcDate(2026, 7, 20), NOW)).toBe(0);
  });
  it("is 0 when there is no expected date", () => {
    expect(daysOverdue(null, NOW)).toBe(0);
  });
});

describe("isLateArrival", () => {
  it("true when received after expected", () => {
    expect(isLateArrival(utcDate(2026, 7, 7), utcDate(2026, 7, 9))).toBe(true);
  });
  it("false when received on/before expected", () => {
    expect(isLateArrival(utcDate(2026, 7, 7), utcDate(2026, 7, 7))).toBe(false);
    expect(isLateArrival(utcDate(2026, 7, 7), utcDate(2026, 7, 5))).toBe(false);
  });
  it("false when not received", () => {
    expect(isLateArrival(utcDate(2026, 7, 7), null)).toBe(false);
  });
  it("false when there is no expected date", () => {
    expect(isLateArrival(null, utcDate(2026, 7, 9))).toBe(false);
  });
});
