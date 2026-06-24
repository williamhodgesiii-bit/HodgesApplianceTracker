import Link from "next/link";
import { getDashboardData, getLabs } from "@/lib/queries";
import { DashboardClient } from "@/components/DashboardClient";
import { formatDisplayWithYear, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ overdue, dueSoon, onTrack }, labs] = await Promise.all([
    getDashboardData(),
    getLabs(),
  ]);
  const total = overdue.length + dueSoon.length + onTrack.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-500">
            Today is{" "}
            <span className="font-semibold text-slate-700">
              {formatDisplayWithYear(today())}
            </span>
          </p>
        </div>
        <Link href="/add" className="btn-primary no-print">
          + Add Appliance
        </Link>
      </div>

      {total === 0 ? (
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
