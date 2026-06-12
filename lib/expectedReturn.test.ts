import { describe, it, expect } from "vitest";
import {
  computeExpectedReturn,
  expectedReturnDate,
  DEFAULT_LEAD_DAYS,
} from "./expectedReturn";
import { utcDate, weekdayName, toDateInputValue, diffInDays } from "./dates";

describe("expectedReturnDate", () => {
  it("defaults to 4 days before delivery", () => {
    expect(DEFAULT_LEAD_DAYS).toBe(4);
  });

  it("DD = Friday Jul 10, 2026 -> Monday Jul 6 (4 days before)", () => {
    const dd = utcDate(2026, 7, 10);
    expect(weekdayName(dd)).toBe("Friday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-07-06");
    expect(result.leadDays).toBe(4);
  });

  it("DD = Thursday Jun 25, 2026 -> Sunday Jun 21 (4 days before)", () => {
    const dd = utcDate(2026, 6, 25);
    expect(weekdayName(dd)).toBe("Thursday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-06-21");
  });

  it("handles month/year boundaries (Jan 2, 2026 Friday)", () => {
    // Jan 2, 2026 is a Friday. Minus 4 = Dec 29, 2025 (Monday).
    const dd = utcDate(2026, 1, 2);
    expect(weekdayName(dd)).toBe("Friday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2025-12-29");
  });

  it("is always exactly leadDays before delivery", () => {
    let d = utcDate(2026, 1, 1);
    for (let i = 0; i < 365; i++) {
      const out = expectedReturnDate(d);
      expect(diffInDays(d, out)).toBe(DEFAULT_LEAD_DAYS);
      d = utcDate(2026, 1, 1 + i + 1);
    }
  });

  it("respects a custom leadDays argument", () => {
    const dd = utcDate(2026, 7, 10);
    expect(toDateInputValue(expectedReturnDate(dd, 7))).toBe("2026-07-03");
  });
});
