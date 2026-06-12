"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Lab } from "@prisma/client";
import type { ApplianceDTO } from "@/lib/queries";
import { formatInputWithYear } from "@/lib/dates";

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
      a.dateSent,
      a.expectedReturnDate,
      a.deliveryDate,
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/report?${params.toString()}`);
  };

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
          value={searchParams.get("labId") ?? ""}
          onChange={(e) => setParam("labId", e.target.value)}
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
          value={searchParams.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value)}
        />
      </div>
      <div>
        <label className="label">Sent to</label>
        <input
          type="date"
          className="input"
          value={searchParams.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value)}
        />
      </div>
      <div className="ml-auto flex gap-2">
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
