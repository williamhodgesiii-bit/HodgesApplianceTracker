"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  parseImport,
  commitImport,
  type CommitResult,
} from "@/lib/import-actions";
import type { ImportPreview, ImportRow } from "@/lib/import";
import { expectedReturnDate } from "@/lib/expectedReturn";
import { parseDateInput, toDateInputValue } from "@/lib/dates";

function recompute(row: ImportRow): ImportRow {
  const reasons: string[] = [];
  if (!row.lab.trim()) reasons.push("Missing lab.");
  if (!row.firstName.trim()) reasons.push("Missing first name.");
  if (!row.lastName.trim()) reasons.push("Missing last name.");
  if (!row.dateSent) reasons.push("Missing sent date.");
  if (!row.deliveryDate) reasons.push("Missing delivery date (DD).");

  const expected = row.deliveryDate
    ? toDateInputValue(expectedReturnDate(parseDateInput(row.deliveryDate)))
    : null;

  return {
    ...row,
    expectedReturnDate: expected,
    reviewReasons: reasons,
    needsReview: reasons.length > 0,
  };
}

export function ImportWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<CommitResult | null>(null);

  const handleUpload = (formData: FormData) => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await parseImport(formData);
      if (!res.ok || !res.preview) {
        setError(res.error ?? "Import failed.");
        setPreview(null);
        return;
      }
      setPreview(res.preview);
      setRows(res.preview.rows);
    });
  };

  const update = (index: number, patch: Partial<ImportRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? recompute({ ...r, ...patch }) : r))
    );
  };

  const handleCommit = () => {
    startTransition(async () => {
      const res = await commitImport(rows);
      setResult(res);
      if (res.ok) {
        setPreview(null);
        setRows([]);
        router.refresh();
      }
    });
  };

  if (result?.ok) {
    return (
      <div className="card p-6">
        <p className="text-lg font-semibold text-green-700">
          ✓ Imported {result.imported} appliance
          {result.imported === 1 ? "" : "s"}.
        </p>
        {result.skipped > 0 && (
          <p className="text-slate-500">
            {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped
            (excluded or missing required data).
          </p>
        )}
        <button
          className="btn-secondary mt-4"
          onClick={() => setResult(null)}
        >
          Import another file
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!preview && (
        <form action={handleUpload} className="card space-y-4 p-6">
          <div>
            <label className="label" htmlFor="file">
              Spreadsheet file (.xlsx)
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx,.xls"
              required
              className="input"
            />
            <p className="mt-2 text-sm text-slate-500">
              One sheet per month (e.g. &quot;June26&quot;) with columns LAB,
              LAST NAME, FIRST NAME, SENT, EXPECTED, RECEIVED, Notes. Delivery
              dates are read from the Notes column (e.g. &quot;DD 7/9&quot;).
            </p>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button className="btn-primary" disabled={isPending}>
            {isPending ? "Reading…" : "Preview Import"}
          </button>
        </form>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm text-slate-600">
              <p>
                <strong>{rows.length}</strong> rows from sheets:{" "}
                {preview.sheetsProcessed.join(", ") || "none"}.
              </p>
              <p>
                {rows.filter((r) => r.needsReview).length} need review ·{" "}
                {rows.filter((r) => r.include && !r.needsReview).length} ready.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                onClick={() => {
                  setPreview(null);
                  setRows([]);
                }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCommit}
                disabled={isPending}
              >
                {isPending
                  ? "Importing…"
                  : `Import ${rows.filter((r) => r.include).length} rows`}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Rows highlighted in amber need attention. Fix the delivery date or
            other fields inline, or uncheck a row to skip it.
          </p>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Use</th>
                  <th className="px-2 py-2">Sheet</th>
                  <th className="px-2 py-2">Lab</th>
                  <th className="px-2 py-2">Last</th>
                  <th className="px-2 py-2">First</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Sent</th>
                  <th className="px-2 py-2">Delivery (DD)</th>
                  <th className="px-2 py-2">Expected</th>
                  <th className="px-2 py-2">Received</th>
                  <th className="px-2 py-2">Notes / Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                  <tr
                    key={`${row.sheet}-${row.rowNumber}`}
                    className={row.needsReview ? "bg-amber-50" : ""}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) =>
                          update(i, { include: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs text-slate-500">
                      {row.sheet}:{row.rowNumber}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-slate-300 px-1 py-0.5"
                        value={row.lab}
                        onChange={(e) => update(i, { lab: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-slate-300 px-1 py-0.5"
                        value={row.lastName}
                        onChange={(e) =>
                          update(i, { lastName: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-24 rounded border border-slate-300 px-1 py-0.5"
                        value={row.firstName}
                        onChange={(e) =>
                          update(i, { firstName: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-28 rounded border border-slate-300 px-1 py-0.5"
                        value={row.applianceType}
                        onChange={(e) =>
                          update(i, { applianceType: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className="rounded border border-slate-300 px-1 py-0.5"
                        value={row.dateSent ?? ""}
                        onChange={(e) =>
                          update(i, { dateSent: e.target.value || null })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className={`rounded border px-1 py-0.5 ${
                          row.deliveryDate
                            ? "border-slate-300"
                            : "border-red-400 bg-red-50"
                        }`}
                        value={row.deliveryDate ?? ""}
                        onChange={(e) =>
                          update(i, { deliveryDate: e.target.value || null })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-slate-500">
                      {row.expectedReturnDate ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        className="rounded border border-slate-300 px-1 py-0.5"
                        value={row.receivedDate ?? ""}
                        onChange={(e) =>
                          update(i, { receivedDate: e.target.value || null })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <div className="text-slate-600">{row.notes}</div>
                      {row.reviewReasons.length > 0 && (
                        <div className="mt-1 font-medium text-amber-700">
                          {row.reviewReasons.join(" ")}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
