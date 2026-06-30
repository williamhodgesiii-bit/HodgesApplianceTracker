import { getReportData, getLabs, type ApplianceFilters } from "@/lib/queries";
import { ReportToolbar } from "@/components/ReportToolbar";
import { formatInput, formatDisplayWithYear, today } from "@/lib/dates";
import type { ApplianceDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";

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
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Patient</th>
              <th className="px-4 py-2">Lab</th>
              <th className="px-4 py-2">Appliance</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Expected</th>
              <th className="px-4 py-2">Delivery</th>
              {showOverdue && <th className="px-4 py-2">Overdue</th>}
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 font-semibold">
                  {a.patientLastName}, {a.patientFirstName}
                </td>
                <td className="px-4 py-2">{a.labName}</td>
                <td className="px-4 py-2">{a.applianceType}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatInput(a.dateSent)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap font-medium">
                  {formatInput(a.expectedReturnDate)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatInput(a.deliveryDate)}
                </td>
                {showOverdue && (
                  <td className="px-4 py-2 font-bold text-red-700">
                    {a.daysOverdue}d
                  </td>
                )}
                <td className="px-4 py-2 text-slate-600">{a.notes || "—"}</td>
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

  const [{ incomplete, overdue, dueSoon, onTrack }, labs] = await Promise.all([
    getReportData(filters),
    getLabs(),
  ]);
  const all = [...incomplete, ...overdue, ...dueSoon, ...onTrack];
  const selectedLab = labs.find((l) => l.id === sp.labId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Appliance Report</h1>
        <p className="text-slate-500">
          Outstanding appliances as of {formatDisplayWithYear(today())}
          {selectedLab ? ` · Lab: ${selectedLab.name}` : ""}
        </p>
      </div>

      <ReportToolbar labs={labs} rows={all} />

      <div className="space-y-5">
        <ReportTable title="Incomplete" emoji="🟠" rows={incomplete} />
        <ReportTable title="Overdue" emoji="🔴" rows={overdue} showOverdue />
        <ReportTable title="Due Soon" emoji="🟡" rows={dueSoon} />
        <ReportTable title="On Track" emoji="🟢" rows={onTrack} />
      </div>
    </div>
  );
}
