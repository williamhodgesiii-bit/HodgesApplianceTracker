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
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn-success px-3 py-1.5 text-sm"
        disabled={isPending}
        onClick={() => submit()}
      >
        {isPending ? "Saving…" : "✓ Mark Received"}
      </button>
      <button
        type="button"
        className="btn-secondary px-2 py-1.5 text-sm"
        title="Pick a different received date"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
      >
        📅
      </button>
      {open && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn-primary px-2 py-1 text-sm"
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
