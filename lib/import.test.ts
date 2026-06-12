import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseWorkbook, excelCellToDateInput } from "./import";

describe("excelCellToDateInput", () => {
  it("parses Excel serial numbers", () => {
    // Excel serial = days since the 1899-12-30 epoch (25569 days before Unix epoch).
    const serial = Math.round(Date.UTC(2025, 6, 9) / 86_400_000) + 25569;
    const out = excelCellToDateInput(serial, 2025);
    expect(out).toBe("2025-07-09");
  });
  it("parses M/D strings using the fallback year", () => {
    expect(excelCellToDateInput("7/9", 2026)).toBe("2026-07-09");
  });
  it("parses M/D/YY strings", () => {
    expect(excelCellToDateInput("7/9/26", 2000)).toBe("2026-07-09");
  });
  it("parses ISO strings", () => {
    expect(excelCellToDateInput("2026-07-09", 2000)).toBe("2026-07-09");
  });
  it("returns null for blanks", () => {
    expect(excelCellToDateInput("", 2026)).toBeNull();
    expect(excelCellToDateInput(null, 2026)).toBeNull();
  });
});

function makeWorkbook() {
  const data = [
    ["LAB", "LAST NAME", "FIRST NAME", "SENT", "EXPECTED", "RECEIVED", "Notes"],
    ["AOA", "Smith", "Ava", "6/1", "6/20", "", "DD 6/25"],
    ["Invisalign", "Jones", "Bob", "6/3", "", "", "rush DD723"], // typo -> review
    ["Vivera", "Lee", "Cara", "6/5", "", "6/22", "patient ready for pickup"], // missing DD
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "June26");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseWorkbook", () => {
  it("parses a sheet, infers year, and flags review rows", () => {
    const buf = makeWorkbook();
    const preview = parseWorkbook(buf, 2026);

    expect(preview.sheetsProcessed).toContain("June26");
    expect(preview.totalRows).toBe(3);

    const [clean, typo, missing] = preview.rows;

    expect(clean.lastName).toBe("Smith");
    expect(clean.deliveryDate).toBe("2026-06-25");
    expect(clean.needsReview).toBe(false);
    // Expected return derived from the rule (4 days before 6/25/2026).
    expect(clean.expectedReturnDate).toBe("2026-06-21");

    expect(typo.needsReview).toBe(true);
    expect(typo.reviewReasons.join(" ")).toMatch(/slash/i);

    expect(missing.needsReview).toBe(true);
    expect(missing.deliveryDate).toBeNull();
    expect(missing.reviewReasons.join(" ")).toMatch(/no delivery date/i);
  });
});
