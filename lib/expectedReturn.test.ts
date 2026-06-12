import { describe, it, expect } from "vitest";
import { computeExpectedReturn, expectedReturnDate } from "./expectedReturn";
import { utcDate, weekdayName, toDateInputValue } from "./dates";

describe("expectedReturnDate", () => {
  it("DD = Friday Jul 10, 2026 -> Tuesday Jul 7 (no roll-back)", () => {
    // Jul 10, 2026 is a Friday.
    const dd = utcDate(2026, 7, 10);
    expect(weekdayName(dd)).toBe("Friday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-07-07");
    expect(weekdayName(result.date)).toBe("Tuesday");
    expect(result.rolledBack).toBe(false);
  });

  it("DD = Monday -> minus 3 lands on Friday (prev week), no roll-back", () => {
    // Jul 13, 2026 is a Monday. Minus 3 = Jul 10 (Friday).
    const dd = utcDate(2026, 7, 13);
    expect(weekdayName(dd)).toBe("Monday");
    const result = computeExpectedReturn(dd);
    expect(weekdayName(result.date)).toBe("Friday");
    expect(toDateInputValue(result.date)).toBe("2026-07-10");
    expect(result.rolledBack).toBe(false);
  });

  it("DD = Tuesday -> minus 3 lands on Saturday -> roll back to Friday", () => {
    // Jul 14, 2026 is a Tuesday. Minus 3 = Jul 11 (Saturday) -> Jul 10 (Fri).
    const dd = utcDate(2026, 7, 14);
    expect(weekdayName(dd)).toBe("Tuesday");
    const result = computeExpectedReturn(dd);
    expect(result.rolledBack).toBe(true);
    expect(result.landedOn).toBe("Saturday");
    expect(weekdayName(result.date)).toBe("Friday");
    expect(toDateInputValue(result.date)).toBe("2026-07-10");
  });

  it("DD = Wednesday -> minus 3 lands on Sunday -> roll back to Friday", () => {
    // Jul 15, 2026 is a Wednesday. Minus 3 = Jul 12 (Sunday) -> Jul 10 (Fri).
    const dd = utcDate(2026, 7, 15);
    expect(weekdayName(dd)).toBe("Wednesday");
    const result = computeExpectedReturn(dd);
    expect(result.rolledBack).toBe(true);
    expect(result.landedOn).toBe("Sunday");
    expect(weekdayName(result.date)).toBe("Friday");
    expect(toDateInputValue(result.date)).toBe("2026-07-10");
  });

  it("DD = Thursday -> minus 3 lands on Monday (no roll-back)", () => {
    // Jul 16, 2026 is a Thursday. Minus 3 = Jul 13 (Monday).
    const dd = utcDate(2026, 7, 16);
    expect(weekdayName(dd)).toBe("Thursday");
    const result = computeExpectedReturn(dd);
    expect(result.rolledBack).toBe(false);
    expect(weekdayName(result.date)).toBe("Monday");
  });

  it("DD = Saturday -> minus 3 lands on Wednesday (no roll-back)", () => {
    // Jul 11, 2026 is a Saturday. Minus 3 = Jul 8 (Wednesday).
    const dd = utcDate(2026, 7, 11);
    expect(weekdayName(dd)).toBe("Saturday");
    const result = computeExpectedReturn(dd);
    expect(result.rolledBack).toBe(false);
    expect(weekdayName(result.date)).toBe("Wednesday");
  });

  it("DD = Sunday -> minus 3 lands on Thursday (no roll-back)", () => {
    // Jul 12, 2026 is a Sunday. Minus 3 = Jul 9 (Thursday).
    const dd = utcDate(2026, 7, 12);
    expect(weekdayName(dd)).toBe("Sunday");
    const result = computeExpectedReturn(dd);
    expect(result.rolledBack).toBe(false);
    expect(weekdayName(result.date)).toBe("Thursday");
  });

  it("handles month/year boundaries (Jan 5, 2026 Monday)", () => {
    // Jan 5, 2026 is a Monday. Minus 3 = Jan 2, 2026 (Friday).
    const dd = utcDate(2026, 1, 5);
    expect(weekdayName(dd)).toBe("Monday");
    const result = computeExpectedReturn(dd);
    expect(toDateInputValue(result.date)).toBe("2026-01-02");
    expect(weekdayName(result.date)).toBe("Friday");
  });

  it("the result is always a business day", () => {
    // Sweep a full year and assert the invariant.
    let d = utcDate(2026, 1, 1);
    for (let i = 0; i < 365; i++) {
      const out = expectedReturnDate(d);
      const dow = weekdayName(out);
      expect(["Saturday", "Sunday"]).not.toContain(dow);
      d = utcDate(2026, 1, 1 + i + 1);
    }
  });
});
