import type { ApplianceDTO } from "@/lib/queries";
import { formatInput, relativeFromInput } from "@/lib/dates";
import { MarkReceived } from "./MarkReceived";

interface SectionProps {
  title: string;
  emoji: string;
  accent: string; // tailwind border/bg accent classes for the header
  rowAccent?: string; // left-border accent applied to each row
  appliances: ApplianceDTO[];
  emptyText: string;
  showOverdue?: boolean;
}

export function DashboardSection({
  title,
  emoji,
  accent,
  rowAccent = "",
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
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Patient</th>
                <th className="th">Lab</th>
                <th className="th">Appliance</th>
                <th className="th">Sent</th>
                <th className="th">Expected Back</th>
                <th className="th">Delivery (DD)</th>
                {showOverdue && <th className="th">Overdue</th>}
                <th className="th">Notes</th>
                <th className="th no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appliances.map((a) => (
                <tr key={a.id} className={`align-top ${rowAccent}`}>
                  <td className="td font-semibold text-slate-900">
                    {a.patientLastName}, {a.patientFirstName}
                  </td>
                  <td className="td">
                    <span className="chip">{a.labName}</span>
                  </td>
                  <td className="td text-slate-600">{a.applianceType}</td>
                  <td className="td whitespace-nowrap text-slate-600">
                    {formatInput(a.dateSent)}
                  </td>
                  <td className="td whitespace-nowrap">
                    <div className="font-semibold text-slate-900">
                      {formatInput(a.expectedReturnDate)}
                    </div>
                    <div
                      className={`text-xs ${
                        a.status === "OVERDUE"
                          ? "font-semibold text-red-600"
                          : "text-slate-400"
                      }`}
                    >
                      {relativeFromInput(a.expectedReturnDate)}
                    </div>
                  </td>
                  <td className="td whitespace-nowrap text-slate-600">
                    {formatInput(a.deliveryDate)}
                  </td>
                  {showOverdue && (
                    <td className="td whitespace-nowrap font-bold text-red-700">
                      {a.daysOverdue} day{a.daysOverdue === 1 ? "" : "s"}
                    </td>
                  )}
                  <td className="td max-w-xs text-slate-600">
                    {a.notes || "—"}
                  </td>
                  <td className="td no-print">
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
