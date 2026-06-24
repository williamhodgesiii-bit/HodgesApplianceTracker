"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllAppliances } from "@/lib/appliance-actions";

const CONFIRM_WORD = "DELETE";

export function ClearDataPanel({ count }: { count: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const armed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await clearAllAppliances();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      setDone(res.count ?? 0);
      setOpen(false);
      setConfirmText("");
      router.refresh();
    });
  };

  if (count === 0 && done === null) {
    return (
      <p className="text-sm text-slate-500">
        There are no appliance records — the database is ready for real data.
      </p>
    );
  }

  return (
    <div className="card border-red-200 bg-red-50/40 p-4">
      {done !== null ? (
        <p className="text-sm font-medium text-green-700">
          ✓ Cleared {done} record{done === 1 ? "" : "s"}. Labs and appliance
          types were kept. You&apos;re ready to enter real data.
        </p>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Permanently delete all{" "}
            <span className="font-semibold">{count}</span> appliance record
            {count === 1 ? "" : "s"}. Labs and appliance types are kept.
          </p>
          <button
            type="button"
            className="btn-secondary whitespace-nowrap border-red-300 text-red-700 hover:bg-red-100"
            onClick={() => setOpen(true)}
          >
            Clear all records…
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            This will permanently delete{" "}
            <span className="font-semibold">{count}</span> appliance record
            {count === 1 ? "" : "s"}. This cannot be undone. Type{" "}
            <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to
            confirm.
          </p>
          <input
            className="input max-w-xs"
            value={confirmText}
            placeholder={CONFIRM_WORD}
            autoFocus
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && armed && !isPending) run();
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary bg-red-600 hover:bg-red-700"
              disabled={!armed || isPending}
              onClick={run}
            >
              {isPending ? "Clearing…" : `Delete all ${count} records`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={isPending}
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
