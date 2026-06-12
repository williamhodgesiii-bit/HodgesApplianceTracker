"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markReceived } from "@/lib/appliance-actions";
import { toDateInputValue } from "@/lib/dates";

export function MarkReceived({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (chosen?: string) => {
    startTransition(async () => {
      await markReceived(id, chosen);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-success whitespace-nowrap px-3 py-1.5 text-sm"
          disabled={isPending}
          onClick={() => submit()}
        >
          {isPending ? "Saving…" : "✓ Mark Received"}
        </button>
        <button
          type="button"
          className={`btn-secondary px-2 py-1.5 text-sm ${
            open ? "ring-2 ring-blue-200" : ""
          }`}
          title="Pick a different received date"
          aria-label="Pick a different received date"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
        >
          📅
        </button>
      </div>

      {/* Custom-date row drops below the buttons so it never overflows the row */}
      {open && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <input
            type="date"
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary whitespace-nowrap px-3 py-1 text-sm"
            onClick={() => submit(date)}
            disabled={isPending}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
