import { STATUS_META, type ApplianceStatus } from "@/lib/status";

const STYLES: Record<ApplianceStatus, string> = {
  INCOMPLETE: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  OVERDUE: "bg-red-100 text-red-800 ring-red-200",
  DUE_SOON: "bg-amber-100 text-amber-800 ring-amber-200",
  ON_TRACK: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function StatusBadge({ status }: { status: ApplianceStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
