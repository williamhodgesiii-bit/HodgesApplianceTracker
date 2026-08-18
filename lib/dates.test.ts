import { describe, it, expect } from "vitest";
import { dateRangeFilter, toDateInputValue } from "./dates";

describe("dateRangeFilter", () => {
  it("returns an empty filter when no bounds are given", () => {
    expect(dateRangeFilter()).toEqual({});
    expect(dateRangeFilter("", "")).toEqual({});
    expect(dateRangeFilter(null, null)).toEqual({});
  });

  it("anchors the lower bound to UTC midnight of `from`", () => {
    const { gte, lt } = dateRangeFilter("2026-08-18", undefined);
    expect(gte?.toISOString()).toBe("2026-08-18T00:00:00.000Z");
    expect(lt).toBeUndefined();
  });

  it("makes the upper bound exclusive of the day AFTER `to`, so `to` stays included", () => {
    const { gte, lt } = dateRangeFilter(undefined, "2026-08-18");
    expect(gte).toBeUndefined();
    // Records sent ON 2026-08-18 must still match: date_sent < 2026-08-19.
    expect(lt?.toISOString()).toBe("2026-08-19T00:00:00.000Z");
  });

  it("builds a full inclusive [from, to] range", () => {
    const { gte, lt } = dateRangeFilter("2026-08-01", "2026-08-31");
    expect(toDateInputValue(gte!)).toBe("2026-08-01");
    // Anything sent up to and including Aug 31 matches (< Sep 1).
    expect(lt?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("is timezone-independent (parses YYYY-MM-DD as UTC, not local)", () => {
    // Regression guard for the old `new Date(str)` upper-bound bug that dropped
    // the `to` day. A single-day range must span exactly that one calendar day.
    const { gte, lt } = dateRangeFilter("2026-12-31", "2026-12-31");
    expect(gte?.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(lt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
