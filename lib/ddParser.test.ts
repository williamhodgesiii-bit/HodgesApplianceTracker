import { describe, it, expect } from "vitest";
import {
  parseDeliveryDateFromNotes,
  inferYearFromSheetName,
  inferMonthFromSheetName,
} from "./ddParser";
import { toDateInputValue } from "./dates";

describe("inferYearFromSheetName", () => {
  it("infers 2-digit trailing year (June26 -> 2026)", () => {
    expect(inferYearFromSheetName("June26", 2000)).toBe(2026);
  });
  it("infers 4-digit year (June 2026)", () => {
    expect(inferYearFromSheetName("June 2026", 2000)).toBe(2026);
  });
  it("falls back when no year present", () => {
    expect(inferYearFromSheetName("Backlog", 2026)).toBe(2026);
  });
});

describe("inferMonthFromSheetName", () => {
  it("June26 -> 6", () => expect(inferMonthFromSheetName("June26")).toBe(6));
  it("Jul24 -> 7", () => expect(inferMonthFromSheetName("Jul24")).toBe(7));
  it("unknown -> null", () =>
    expect(inferMonthFromSheetName("Backlog")).toBeNull());
});

describe("parseDeliveryDateFromNotes", () => {
  it('parses "DD 7/9"', () => {
    const r = parseDeliveryDateFromNotes("ready DD 7/9 please", 2026);
    expect(r.found).toBe(true);
    expect(r.needsReview).toBe(false);
    expect(toDateInputValue(r.date!)).toBe("2026-07-09");
  });

  it('parses "DD7/9" (no space)', () => {
    const r = parseDeliveryDateFromNotes("DD7/9", 2026);
    expect(r.needsReview).toBe(false);
    expect(toDateInputValue(r.date!)).toBe("2026-07-09");
  });

  it('parses "DD 6/25"', () => {
    const r = parseDeliveryDateFromNotes("appt DD 6/25", 2026);
    expect(toDateInputValue(r.date!)).toBe("2026-06-25");
  });

  it('parses lowercase "dd7/24"', () => {
    const r = parseDeliveryDateFromNotes("rush dd7/24", 2026);
    expect(r.needsReview).toBe(false);
    expect(toDateInputValue(r.date!)).toBe("2026-07-24");
  });

  it('flags typo "DD723" for review and guesses 7/23', () => {
    const r = parseDeliveryDateFromNotes("DD723", 2026);
    expect(r.found).toBe(true);
    expect(r.needsReview).toBe(true);
    expect(r.month).toBe(7);
    expect(r.day).toBe(23);
    expect(r.reviewReason).toMatch(/without a slash/i);
  });

  it("flags an invalid date for review (DD 13/40)", () => {
    const r = parseDeliveryDateFromNotes("DD 13/40", 2026);
    expect(r.found).toBe(true);
    expect(r.needsReview).toBe(true);
    expect(r.date).toBeNull();
  });

  it("flags a bare DD with no date", () => {
    const r = parseDeliveryDateFromNotes("need DD soon", 2026);
    expect(r.found).toBe(true);
    expect(r.needsReview).toBe(true);
    expect(r.reviewReason).toMatch(/no date/i);
  });

  it("returns not-found when there is no DD reference", () => {
    const r = parseDeliveryDateFromNotes("just some notes", 2026);
    expect(r.found).toBe(false);
    expect(r.needsReview).toBe(false);
  });

  it("handles empty / null notes", () => {
    expect(parseDeliveryDateFromNotes("", 2026).found).toBe(false);
    expect(parseDeliveryDateFromNotes(null, 2026).found).toBe(false);
    expect(parseDeliveryDateFromNotes(undefined, 2026).found).toBe(false);
  });

  it("infers year from sheet name end-to-end", () => {
    const year = inferYearFromSheetName("June26", 2026);
    const r = parseDeliveryDateFromNotes("DD 6/30", year);
    expect(toDateInputValue(r.date!)).toBe("2026-06-30");
  });
});
