import Link from "next/link";
import { getDashboardData } from "@/lib/queries";
import { DashboardSection } from "@/components/DashboardSection";
import { formatDisplayWithYear, today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { incomplete, overdue, dueSoon, onTrack } = await getDashboardData();
  const total =
    incomplete.length + overdue.length + dueSoon.length + onTrack.length;

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
        <div className="space-y-6">
          <DashboardSection
            title="Incomplete"
            emoji="🟠"
            accent="border-orange-200 bg-orange-50 text-orange-900"
            appliances={incomplete}
            emptyText="No incomplete entries — every appliance has its dates."
          />
          <DashboardSection
            title="Overdue"
            emoji="🔴"
            accent="border-red-200 bg-red-50 text-red-900"
            appliances={overdue}
            emptyText="Nothing overdue. 🎉"
            showOverdue
          />
          <DashboardSection
            title="Due Soon"
            emoji="🟡"
            accent="border-amber-200 bg-amber-50 text-amber-900"
            appliances={dueSoon}
            emptyText="Nothing due in the next 3 business days."
          />
          <DashboardSection
            title="On Track"
            emoji="🟢"
            accent="border-green-200 bg-green-50 text-green-900"
            appliances={onTrack}
            emptyText="Nothing further out right now."
          />
        </div>
      )}
    </div>
  );
}
