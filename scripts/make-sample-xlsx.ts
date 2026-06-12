/**
 * Generates `sample-import.xlsx` — a small workbook in the same shape as the
 * office's legacy spreadsheet, useful for trying out the Import page.
 *
 *   npm run sample:xlsx
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";

const header = [
  "LAB",
  "LAST NAME",
  "FIRST NAME",
  "SENT",
  "EXPECTED",
  "RECEIVED",
  "Notes",
];

const june = [
  header,
  ["Invisalign", "Adams", "Grace", "6/1/26", "6/22/26", "", "DD 6/25"],
  ["AOA", "Baker", "Henry", "6/2/26", "6/24/26", "", "Expander DD7/1"],
  ["Vivera", "Clark", "Iris", "6/3/26", "", "6/19/26", "retainer DD 6/22"],
  ["Angel Aligners", "Diaz", "Jack", "6/4/26", "", "", "rush DD723"], // typo
  ["Invisalign", "Evans", "Kara", "6/5/26", "", "", "no delivery noted yet"], // needs review
];

const july = [
  header,
  ["AOA", "Foster", "Leo", "7/1/26", "", "", "DD 7/24"],
  ["Vivera", "Green", "Mia", "7/2/26", "", "", "DD7/28"],
  ["Invisalign", "Hill", "Noah", "7/6/26", "", "", "aligners dd 8/3"],
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(june), "June26");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(july), "July26");

const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync("sample-import.xlsx", buf);
console.log("✓ Wrote sample-import.xlsx");
