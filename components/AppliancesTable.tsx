"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Lab } from "@prisma/client";
import type { ApplianceDTO } from "@/lib/queries";
import { formatInput } from "@/lib/dates";
import { StatusBadge } from "./StatusBadge";
import { ApplianceForm } from "./ApplianceForm";
import { MarkReceived } from "./MarkReceived";
import {
  markUnreceived,
  deleteAppliance,
} from "@/lib/appliance-actions";

interface Props {
  appliances: ApplianceDTO[];
  labs: Lab[];
  applianceTypes: string[];
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "OUTSTANDING", label: "Outstanding (not received)" },
  { value: "INCOMPLETE", label: "🟠 Incomplete" },
  { value: "OVERDUE", label: "🔴 Overdue" },
  { value: "DUE_SOON", label: "🟡 Due Soon" },
  { value: "ON_TRACK", label: "🟢 On Track" },
  { value: "RECEIVED", label: "✅ Received" },
];

export function AppliancesTable({ appliances, labs, applianceTypes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingId, setEditingId] = useState<string | null>(null);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/appliances?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="label">Search patient / appliance</label>
          <input
            className="input"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Type a name…"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("q", (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => setParam("q", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Lab</label>
          <select
            className="input"
            value={searchParams.get("labId") ?? ""}
            onChange={(e) => setParam("labId", e.target.value)}
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
            value={searchParams.get("status") ?? "ALL"}
            onChange={(e) => setParam("status", e.target.value)}
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
              value={searchParams.get("from") ?? ""}
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div>
            <label className="label">to</label>
            <input
              type="date"
              className="input"
              value={searchParams.get("to") ?? ""}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {appliances.length} appliance{appliances.length === 1 ? "" : "s"}
      </p>

      {appliances.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No appliances match these filters.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Patient</th>
                <th className="px-3 py-2">Lab</th>
                <th className="px-3 py-2">Appliance</th>
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2">Expected</th>
                <th className="px-3 py-2">Delivery</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appliances.map((a) => (
                <FragmentRow
                  key={a.id}
                  a={a}
                  labs={labs}
                  applianceTypes={applianceTypes}
                  editing={editingId === a.id}
                  onEdit={() => setEditingId(a.id)}
                  onCancel={() => setEditingId(null)}
                  onRefresh={() => router.refresh()}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  a,
  labs,
  applianceTypes,
  editing,
  onEdit,
  onCancel,
  onRefresh,
}: {
  a: ApplianceDTO;
  labs: Lab[];
  applianceTypes: string[];
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  return (
    <>
      <tr className="align-top">
        <td className="px-3 py-3">
          <StatusBadge status={a.status} />
        </td>
        <td className="px-3 py-3 font-semibold">
          {a.patientLastName}, {a.patientFirstName}
        </td>
        <td className="px-3 py-3">{a.labName}</td>
        <td className="px-3 py-3">{a.applianceType}</td>
        <td className="px-3 py-3 whitespace-nowrap">{formatInput(a.dateSent)}</td>
        <td className="px-3 py-3 whitespace-nowrap">
          {formatInput(a.expectedReturnDate)}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {formatInput(a.deliveryDate)}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {a.receivedDate ? (
            <span className={a.isLate ? "font-bold text-red-700" : ""}>
              {formatInput(a.receivedDate)}
              {a.isLate && " (late)"}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="max-w-xs px-3 py-3 text-slate-600">{a.notes || "—"}</td>
        <td className="whitespace-nowrap px-3 py-3">
          <div className="flex items-center gap-2">
            <button className="btn-secondary px-2 py-1 text-xs" onClick={onEdit}>
              Edit
            </button>
            {a.receivedDate ? (
              <button
                className="btn-secondary px-2 py-1 text-xs"
                onClick={async () => {
                  await markUnreceived(a.id);
                  onRefresh();
                }}
              >
                Undo receive
              </button>
            ) : null}
            <button
              className="px-2 py-1 text-xs text-red-600 hover:underline"
              onClick={async () => {
                if (confirm(`Delete record for ${a.patientFirstName} ${a.patientLastName}?`)) {
                  await deleteAppliance(a.id);
                  onRefresh();
                }
              }}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {!a.receivedDate && !editing && (
        <tr>
          <td colSpan={10} className="bg-slate-50 px-3 py-2">
            <MarkReceived id={a.id} />
          </td>
        </tr>
      )}
      {editing && (
        <tr>
          <td colSpan={10} className="bg-blue-50/50 px-4 py-4">
            <ApplianceForm
              mode="edit"
              labs={labs}
              applianceTypes={applianceTypes}
              initial={a}
              onDone={onCancel}
            />
          </td>
        </tr>
      )}
    </>
  );
}
