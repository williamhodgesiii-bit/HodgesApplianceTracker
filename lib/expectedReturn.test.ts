import { describe, it, expect } from "vitest";
import {
  computeExpectedReturn,
  expectedReturnDate,
  DEFAULT_LEAD_DAYS,
} from "./expectedReturn";
import { utcDate, weekdayName, toDateInputValue, isWeekend } from "./dates";

describe("expectedReturnDate", () => {
  it("defaults to 4 days before delivery", () => {
    expect(DEFAULT_LEAD_DAYS).toBe(4);
  });

  it("DD = Friday Jul 10, 2026 -> Monday Jul 6 (weekday, no move)", () => {
    const dd = utcDate(2026, 7, 10);
    expect(weekdayName(dd)).toBe("Friday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-07-06");
    expect(result.movedOffWeekend).toBe(false);
  });

  it("DD = Thursday Jun 25, 2026 -> lands Sunday, moves back to Friday Jun 19", () => {
    const dd = utcDate(2026, 6, 25);
    expect(weekdayName(dd)).toBe("Thursday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-06-19");
    expect(weekdayName(result.date)).toBe("Friday");
    expect(result.movedOffWeekend).toBe(true);
  });

  it("DD = Wednesday Jul 15, 2026 -> lands Saturday, moves back to Friday Jul 10", () => {
    const dd = utcDate(2026, 7, 15);
    expect(weekdayName(dd)).toBe("Wednesday");
    const result = computeExpectedReturn(dd);
    expect(weekdayName(result.date)).toBe("Friday");
    expect(toDateInputValue(result.date)).toBe("2026-07-10");
    expect(result.movedOffWeekend).toBe(true);
  });

  it("the result is always a business day", () => {
    let d = utcDate(2026, 1, 1);
    for (let i = 0; i < 365; i++) {
      const out = expectedReturnDate(d);
      expect(isWeekend(out)).toBe(false);
      d = utcDate(2026, 1, 1 + i + 1);
    }
  });

  it("respects a custom leadDays argument", () => {
    // Jul 10 (Fri) minus 7 = Jul 3 (Fri), a weekday.
    const dd = utcDate(2026, 7, 10);
    expect(toDateInputValue(expectedReturnDate(dd, 7))).toBe("2026-07-03");
  });
});
