"use client";

import { useMemo, useState } from "react";
import type { Lab } from "@prisma/client";
import type { ApplianceDTO } from "@/lib/queries";
import type { ApplianceStatus } from "@/lib/status";
import { DashboardSection } from "./DashboardSection";

interface Props {
  overdue: ApplianceDTO[];
  dueSoon: ApplianceDTO[];
  onTrack: ApplianceDTO[];
  labs: Lab[];
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OVERDUE", label: "🔴 Overdue" },
  { value: "DUE_SOON", label: "🟡 Due Soon" },
  { value: "ON_TRACK", label: "🟢 On Track" },
];

export function DashboardClient({ overdue, dueSoon, onTrack, labs }: Props) {
  const [q, setQ] = useState("");
  const [labId, setLabId] = useState("");
  const [status, setStatus] = useState<ApplianceStatus | "ALL">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (a: ApplianceDTO) => {
      if (needle) {
        const haystack = [
          a.patientFirstName,
          a.patientLastName,
          `${a.patientFirstName} ${a.patientLastName}`,
          `${a.patientLastName} ${a.patientFirstName}`,
          a.applianceType,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (labId && a.labId !== labId) return false;
      if (status !== "ALL" && a.status !== status) return false;
      // dateSent is YYYY-MM-DD, so lexical comparison is chronological.
      if (from && a.dateSent < from) return false;
      if (to && a.dateSent > to) return false;
      return true;
    };
  }, [q, labId, status, from, to]);

  const filteredOverdue = useMemo(() => overdue.filter(matches), [overdue, matches]);
  const filteredDueSoon = useMemo(() => dueSoon.filter(matches), [dueSoon, matches]);
  const filteredOnTrack = useMemo(() => onTrack.filter(matches), [onTrack, matches]);

  const filtersActive = Boolean(q || labId || status !== "ALL" || from || to);
  const visibleTotal =
    filteredOverdue.length + filteredDueSoon.length + filteredOnTrack.length;

  const clearFilters = () => {
    setQ("");
    setLabId("");
    setStatus("ALL");
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="card grid grid-cols-1 gap-3 p-4 no-print sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="label">Search patient / appliance</label>
          <input
            className="input"
            value={q}
            placeholder="Type a first or last name…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Lab</label>
          <select
            className="input"
            value={labId}
            onChange={(e) => setLabId(e.target.value)}
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
          <label className="label">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplianceStatus | "ALL")}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Sent from</label>
            <input
              type="date"
              className="input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">to</label>
            <input
              type="date"
              className="input"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtersActive && (
        <div className="flex items-center justify-between text-sm text-slate-500 no-print">
          <span>
            {visibleTotal} matching appliance{visibleTotal === 1 ? "" : "s"}
          </span>
          <button
            className="font-medium text-blue-600 hover:underline"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="space-y-6">
        <DashboardSection
          title="Overdue"
          emoji="🔴"
          accent="border-red-200 bg-red-50 text-red-900"
          rowAccent="border-l-4 border-l-red-400"
          appliances={filteredOverdue}
          emptyText={
            filtersActive
              ? "No overdue appliances match these filters."
              : "Nothing overdue. 🎉"
          }
          showOverdue
        />
        <DashboardSection
          title="Due Soon"
          emoji="🟡"
          accent="border-amber-200 bg-amber-50 text-amber-900"
          rowAccent="border-l-4 border-l-amber-300"
          appliances={filteredDueSoon}
          emptyText={
            filtersActive
              ? "No due-soon appliances match these filters."
              : "Nothing due in the next 3 business days."
          }
        />
        <DashboardSection
          title="On Track"
          emoji="🟢"
          accent="border-emerald-200 bg-emerald-50 text-emerald-900"
          rowAccent="border-l-4 border-l-emerald-300"
          appliances={filteredOnTrack}
          emptyText={
            filtersActive
              ? "No on-track appliances match these filters."
              : "Nothing further out right now."
          }
        />
      </div>
    </div>
  );
}
