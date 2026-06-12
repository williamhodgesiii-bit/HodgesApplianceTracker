import { STATUS_META, type ApplianceStatus } from "@/lib/status";

const STYLES: Record<ApplianceStatus, string> = {
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  DUE_SOON: "bg-amber-100 text-amber-800 border-amber-200",
  ON_TRACK: "bg-green-100 text-green-800 border-green-200",
  RECEIVED: "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({ status }: { status: ApplianceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
