"use client";

import type { Lab } from "@prisma/client";
import type { ApplianceDTO } from "@/lib/queries";
import { formatInputWithYear } from "@/lib/dates";
import { useUrlFilters } from "@/lib/useUrlFilters";

const FILTER_KEYS = ["labId", "from", "to"] as const;

function toCsv(rows: ApplianceDTO[]): string {
  const headers = [
    "Status",
    "Patient Last",
    "Patient First",
    "Lab",
    "Appliance Type",
    "Date Sent",
    "Expected Return",
    "Delivery Date",
    "Received Date",
    "Days Overdue",
    "Notes",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((a) =>
    [
      a.status,
      a.patientLastName,
      a.patientFirstName,
      a.labName,
      a.applianceType,
      a.dateSent ?? "",
      a.expectedReturnDate ?? "",
      a.deliveryDate ?? "",
      a.receivedDate ?? "",
      a.daysOverdue ? String(a.daysOverdue) : "",
      a.notes,
    ]
      .map(escape)
      .join(",")
  );
  return [headers.map(escape).join(","), ...lines].join("\n");
}

export function ReportToolbar({
  labs,
  rows,
}: {
  labs: Lab[];
  rows: ApplianceDTO[];
}) {
  const { values, setFilter, isPending } = useUrlFilters(FILTER_KEYS);

  const downloadCsv = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const stamp = formatInputWithYear(
      new Date().toISOString().slice(0, 10)
    ).replace(/[ ,]+/g, "-");
    link.download = `appliance-report-${stamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label">Lab</label>
        <select
          className="input"
          value={values.labId}
          onChange={(e) => setFilter("labId", e.target.value)}
        >
          <option value="">All labs</option>
          {labs.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Sent from</label>
        <input
          type="date"
          className="input"
          value={values.from}
          onChange={(e) => setFilter("from", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Sent to</label>
        <input
          type="date"
          className="input"
          value={values.to}
          onChange={(e) => setFilter("to", e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span
          className={`text-xs text-slate-400 transition-opacity ${
            isPending ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!isPending}
        >
          Updating…
        </span>
        <button className="btn-secondary" onClick={downloadCsv}>
          ⬇ Export CSV
        </button>
        <button className="btn-primary" onClick={() => window.print()}>
          🖨 Print / PDF
        </button>
      </div>
    </div>
  );
}
