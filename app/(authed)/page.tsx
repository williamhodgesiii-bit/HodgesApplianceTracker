import Link from "next/link";
import { getDashboardData, getReceivedRecentCount, getLabs } from "@/lib/queries";
import { DashboardClient } from "@/components/DashboardClient";
import { formatDisplayWithYear, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

function KpiCard({
  href,
  value,
  label,
  accent,
  ring,
}: {
  href: string;
  value: number;
  label: string;
  accent: string;
  ring: string;
}) {
  return (
    <Link href={href} className={`kpi ${ring}`}>
      <span className={`kpi-value ${accent}`}>{value}</span>
      <span className="kpi-label text-slate-500">{label}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const [{ overdue, dueSoon, onTrack }, receivedThisWeek, labs] =
    await Promise.all([
      getDashboardData(),
      getReceivedRecentCount(7),
      getLabs(),
    ]);
  const totalOutstanding = overdue.length + dueSoon.length + onTrack.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500">
            {formatDisplayWithYear(today())} ·{" "}
            <span className="font-semibold text-slate-700">
              {totalOutstanding}
            </span>{" "}
            appliance{totalOutstanding === 1 ? "" : "s"} out at the lab
          </p>
        </div>
        <Link href="/add" className="btn-primary no-print">
          + Add Appliance
        </Link>
      </div>

      {/* At-a-glance KPI cards (click to drill in) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          href="/appliances?status=OVERDUE"
          value={overdue.length}
          label="Overdue"
          accent="text-red-600"
          ring="border-red-200"
        />
        <KpiCard
          href="/appliances?status=DUE_SOON"
          value={dueSoon.length}
          label="Due soon"
          accent="text-amber-600"
          ring="border-amber-200"
        />
        <KpiCard
          href="/appliances?status=ON_TRACK"
          value={onTrack.length}
          label="On track"
          accent="text-emerald-600"
          ring="border-emerald-200"
        />
        <KpiCard
          href="/appliances?status=RECEIVED"
          value={receivedThisWeek}
          label="Received this week"
          accent="text-slate-700"
          ring="border-slate-200"
        />
      </div>

      {totalOutstanding === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-medium text-slate-700">
            🎉 Nothing outstanding!
          </p>
          <p className="mt-1 text-slate-500">
            Every appliance has been received. Add a new one when you send the
            next case to a lab.
          </p>
          <Link href="/add" className="btn-primary mt-4">
            + Add Appliance
          </Link>
        </div>
      ) : (
        <DashboardClient
          overdue={overdue}
          dueSoon={dueSoon}
          onTrack={onTrack}
          labs={labs}
        />
      )}
    </div>
  );
}
