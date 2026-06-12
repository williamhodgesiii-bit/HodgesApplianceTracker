/**
 * Spreadsheet import parsing.
 *
 * The legacy workbook has one sheet per month, named like "June26". Each sheet
 * has columns: LAB, LAST NAME, FIRST NAME, SENT, EXPECTED, RECEIVED, Notes.
 * Delivery dates live inside the Notes column as "DD 7/9" style references.
 */

import * as XLSX from "xlsx";
import { utcDate, toDateInputValue } from "./dates";
import {
  parseDeliveryDateFromNotes,
  inferYearFromSheetName,
} from "./ddParser";
import { expectedReturnDate } from "./expectedReturn";

export interface ImportRow {
  sheet: string;
  rowNumber: number;
  lab: string;
  firstName: string;
  lastName: string;
  applianceType: string;
  dateSent: string | null;
  receivedDate: string | null;
  /** Delivery date parsed from the notes (YYYY-MM-DD) or null. */
  deliveryDate: string | null;
  /** Expected return derived from the delivery date (preview only). */
  expectedReturnDate: string | null;
  notes: string;
  needsReview: boolean;
  reviewReasons: string[];
  include: boolean;
}

export interface ImportPreview {
  rows: ImportRow[];
  sheetsProcessed: string[];
  totalRows: number;
  reviewCount: number;
}

const HEADER_ALIASES: Record<string, keyof HeaderMap> = {
  lab: "lab",
  lastname: "lastName",
  last: "lastName",
  firstname: "firstName",
  first: "firstName",
  sent: "sent",
  datesent: "sent",
  expected: "expected",
  received: "received",
  receiveddate: "received",
  notes: "notes",
  note: "notes",
};

interface HeaderMap {
  lab: number;
  lastName: number;
  firstName: number;
  sent: number;
  expected: number;
  received: number;
  notes: number;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headerRow: unknown[]): Partial<HeaderMap> {
  const map: Partial<HeaderMap> = {};
  headerRow.forEach((cell, idx) => {
    const key = HEADER_ALIASES[normalizeHeader(cell)];
    if (key && map[key] === undefined) map[key] = idx;
  });
  return map;
}

/**
 * Convert an Excel cell value (serial number, Date, or string) to a
 * YYYY-MM-DD string. Returns null when it can't be interpreted.
 */
export function excelCellToDateInput(
  value: unknown,
  fallbackYear: number
): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel serial number.
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y) {
      return toDateInputValue(utcDate(parsed.y, parsed.m, parsed.d));
    }
    return null;
  }

  // JS Date (when read with cellDates). Use local components — that's how
  // SheetJS constructs them — then re-anchor to UTC midnight.
  if (value instanceof Date) {
    return toDateInputValue(
      utcDate(value.getFullYear(), value.getMonth() + 1, value.getDate())
    );
  }

  // String like "7/9", "7/9/26", "2026-07-09".
  const str = String(value).trim();
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return toDateInputValue(
      utcDate(parseInt(iso[1]), parseInt(iso[2]), parseInt(iso[3]))
    );
  }
  const slash = str.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const month = parseInt(slash[1], 10);
    const day = parseInt(slash[2], 10);
    let year = fallbackYear;
    if (slash[3]) {
      const y = parseInt(slash[3], 10);
      year = y < 100 ? 2000 + y : y;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return toDateInputValue(utcDate(year, month, day));
    }
  }
  return null;
}

/** Parse a whole workbook buffer into a review-ready preview. */
export function parseWorkbook(
  data: ArrayBuffer | Buffer,
  fallbackYear: number
): ImportPreview {
  const workbook = XLSX.read(data, { type: "buffer", cellDates: false });
  const rows: ImportRow[] = [];
  const sheetsProcessed: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    if (grid.length === 0) continue;

    const headerMap = buildHeaderMap(grid[0]);
    // Skip sheets that don't look like data sheets.
    if (headerMap.lastName === undefined && headerMap.firstName === undefined) {
      continue;
    }
    sheetsProcessed.push(sheetName);

    const year = inferYearFromSheetName(sheetName, fallbackYear);

    for (let r = 1; r < grid.length; r++) {
      const row = grid[r];
      const get = (key: keyof HeaderMap): string => {
        const idx = headerMap[key];
        return idx === undefined ? "" : String(row[idx] ?? "").trim();
      };
      const getRaw = (key: keyof HeaderMap): unknown => {
        const idx = headerMap[key];
        return idx === undefined ? "" : row[idx];
      };

      const lab = get("lab");
      const firstName = get("firstName");
      const lastName = get("lastName");
      const notes = get("notes");

      // Skip completely empty rows.
      if (!lab && !firstName && !lastName && !notes) continue;

      const reviewReasons: string[] = [];
      const dateSent = excelCellToDateInput(getRaw("sent"), year);
      const receivedDate = excelCellToDateInput(getRaw("received"), year);

      // Delivery date comes from the notes.
      const dd = parseDeliveryDateFromNotes(notes, year);
      let deliveryDate: string | null = null;
      if (dd.found && dd.date && !dd.needsReview) {
        deliveryDate = toDateInputValue(dd.date);
      } else if (dd.found && dd.needsReview) {
        if (dd.date) deliveryDate = toDateInputValue(dd.date);
        reviewReasons.push(dd.reviewReason ?? "Delivery date needs review.");
      } else {
        reviewReasons.push("No delivery date (DD) found in notes.");
      }

      if (!lab) reviewReasons.push("Missing lab.");
      if (!firstName) reviewReasons.push("Missing first name.");
      if (!lastName) reviewReasons.push("Missing last name.");
      if (!dateSent) reviewReasons.push("Missing or unparseable sent date.");

      const expected = deliveryDate
        ? toDateInputValue(
            expectedReturnDate(
              utcDate(
                ...(deliveryDate.split("-").map((n) => parseInt(n, 10)) as [
                  number,
                  number,
                  number
                ])
              )
            )
          )
        : null;

      rows.push({
        sheet: sheetName,
        rowNumber: r + 1,
        lab,
        firstName,
        lastName,
        applianceType: "(imported)",
        dateSent,
        receivedDate,
        deliveryDate,
        expectedReturnDate: expected,
        notes,
        needsReview: reviewReasons.length > 0,
        reviewReasons,
        include: true,
      });
    }
  }

  return {
    rows,
    sheetsProcessed,
    totalRows: rows.length,
    reviewCount: rows.filter((r) => r.needsReview).length,
  };
}
