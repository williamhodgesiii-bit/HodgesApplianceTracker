import { getReportData, getLabs, type ApplianceFilters } from "@/lib/queries";
import { ReportToolbar } from "@/components/ReportToolbar";
import {
  formatInput,
  relativeFromInput,
  formatDisplayWithYear,
  today,
} from "@/lib/dates";
import type { ApplianceDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";

function SummaryBand({
  overdue,
  dueSoon,
  onTrack,
}: {
  overdue: number;
  dueSoon: number;
  onTrack: number;
}) {
  const total = overdue + dueSoon + onTrack;
  const cell = (value: number, label: string, color: string) => (
    <div className="flex flex-col px-4 py-3">
      <span className={`text-2xl font-bold leading-none ${color}`}>{value}</span>
      <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
    </div>
  );
  return (
    <div className="print-full card grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
      {cell(total, "Outstanding", "text-slate-900")}
      {cell(overdue, "Overdue", "text-red-600")}
      {cell(dueSoon, "Due soon", "text-amber-600")}
      {cell(onTrack, "On track", "text-emerald-600")}
    </div>
  );
}

function LabBreakdown({ rows }: { rows: ApplianceDTO[] }) {
  const byLab = new Map<
    string,
    { overdue: number; dueSoon: number; onTrack: number; total: number }
  >();
  for (const r of rows) {
    const e =
      byLab.get(r.labName) ??
      { overdue: 0, dueSoon: 0, onTrack: 0, total: 0 };
    if (r.status === "OVERDUE") e.overdue++;
    else if (r.status === "DUE_SOON") e.dueSoon++;
    else if (r.status === "ON_TRACK") e.onTrack++;
    e.total++;
    byLab.set(r.labName, e);
  }
  const labs = [...byLab.entries()].sort(
    (a, b) => b[1].overdue - a[1].overdue || b[1].total - a[1].total
  );

  if (labs.length === 0) return null;

  return (
    <section className="print-full card overflow-hidden">
      <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-lg font-bold">
        By Lab
      </h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="th">Lab</th>
            <th className="th text-right">Overdue</th>
            <th className="th text-right">Due soon</th>
            <th className="th text-right">On track</th>
            <th className="th text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {labs.map(([name, c]) => (
            <tr key={name}>
              <td className="td font-medium">{name}</td>
              <td className="td text-right font-semibold text-red-700">
                {c.overdue || "—"}
              </td>
              <td className="td text-right text-amber-700">
                {c.dueSoon || "—"}
              </td>
              <td className="td text-right text-emerald-700">
                {c.onTrack || "—"}
              </td>
              <td className="td text-right font-semibold">{c.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportTable({
  title,
  emoji,
  rows,
  showOverdue,
}: {
  title: string;
  emoji: string;
  rows: ApplianceDTO[];
  showOverdue?: boolean;
}) {
  return (
    <section className="print-full card overflow-hidden">
      <h2 className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-lg font-bold">
        {emoji} {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-slate-500">None.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="th">Patient</th>
              <th className="th">Lab</th>
              <th className="th">Appliance</th>
              <th className="th">Sent</th>
              <th className="th">Expected</th>
              <th className="th">Delivery</th>
              {showOverdue && <th className="th">Overdue</th>}
              <th className="th">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="td font-semibold">
                  {a.patientLastName}, {a.patientFirstName}
                </td>
                <td className="td">{a.labName}</td>
                <td className="td">{a.applianceType}</td>
                <td className="td whitespace-nowrap">
                  {formatInput(a.dateSent)}
                </td>
                <td className="td whitespace-nowrap">
                  <span className="font-medium">
                    {formatInput(a.expectedReturnDate)}
                  </span>
                  <span className="ml-1 text-xs text-slate-400">
                    ({relativeFromInput(a.expectedReturnDate)})
                  </span>
                </td>
                <td className="td whitespace-nowrap">
                  {formatInput(a.deliveryDate)}
                </td>
                {showOverdue && (
                  <td className="td font-bold text-red-700">{a.daysOverdue}d</td>
                )}
                <td className="td text-slate-600">{a.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: ApplianceFilters = {
    labId: sp.labId,
    from: sp.from,
    to: sp.to,
  };

  const [{ overdue, dueSoon, onTrack }, labs] = await Promise.all([
    getReportData(filters),
    getLabs(),
  ]);
  const all = [...overdue, ...dueSoon, ...onTrack];
  const selectedLab = labs.find((l) => l.id === sp.labId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appliance Report</h1>
        <p className="text-slate-500">
          Outstanding appliances as of {formatDisplayWithYear(today())}
          {selectedLab ? ` · Lab: ${selectedLab.name}` : ""}
        </p>
      </div>

      <ReportToolbar labs={labs} rows={all} />

      <SummaryBand
        overdue={overdue.length}
        dueSoon={dueSoon.length}
        onTrack={onTrack.length}
      />

      <LabBreakdown rows={all} />

      <div className="space-y-5">
        <ReportTable title="Overdue" emoji="🔴" rows={overdue} showOverdue />
        <ReportTable title="Due Soon" emoji="🟡" rows={dueSoon} />
        <ReportTable title="On Track" emoji="🟢" rows={onTrack} />
      </div>
    </div>
  );
}
