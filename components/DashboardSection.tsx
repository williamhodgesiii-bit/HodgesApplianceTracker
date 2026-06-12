import type { ApplianceDTO } from "@/lib/queries";
import { formatInput } from "@/lib/dates";
import { MarkReceived } from "./MarkReceived";

interface SectionProps {
  title: string;
  emoji: string;
  accent: string; // tailwind border/bg accent classes for the header
  appliances: ApplianceDTO[];
  emptyText: string;
  showOverdue?: boolean;
}

export function DashboardSection({
  title,
  emoji,
  accent,
  appliances,
  emptyText,
  showOverdue = false,
}: SectionProps) {
  return (
    <section className="card overflow-hidden">
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${accent}`}
      >
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden>{emoji}</span>
          {title}
        </h2>
        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-sm font-semibold">
          {appliances.length}
        </span>
      </div>

      {appliances.length === 0 ? (
        <p className="px-4 py-6 text-center text-slate-500">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Lab</th>
                <th className="px-4 py-2">Appliance</th>
                <th className="px-4 py-2">Sent</th>
                <th className="px-4 py-2">Expected Back</th>
                <th className="px-4 py-2">Delivery (DD)</th>
                {showOverdue && <th className="px-4 py-2">Overdue</th>}
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appliances.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {a.patientLastName}, {a.patientFirstName}
                  </td>
                  <td className="px-4 py-3">{a.labName}</td>
                  <td className="px-4 py-3">{a.applianceType}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatInput(a.dateSent)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatInput(a.expectedReturnDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatInput(a.deliveryDate)}
                  </td>
                  {showOverdue && (
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-red-700">
                      {a.daysOverdue} day{a.daysOverdue === 1 ? "" : "s"}
                    </td>
                  )}
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    {a.notes || "—"}
                  </td>
                  <td className="px-4 py-3 no-print">
                    <MarkReceived id={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
