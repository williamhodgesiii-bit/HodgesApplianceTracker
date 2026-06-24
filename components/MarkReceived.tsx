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

  const save = () => {
    startTransition(async () => {
      await markReceived(id, date);
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-success whitespace-nowrap px-3 py-1.5 text-sm"
          onClick={() => {
            setDate(toDateInputValue(new Date()));
            setOpen(true);
          }}
        >
          ✓ Mark Received
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="text-sm font-medium text-slate-600" htmlFor={`received-${id}`}>
        Received on
      </label>
      <input
        id={`received-${id}`}
        type="date"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={isPending}
      />
      <button
        type="button"
        className="btn-success whitespace-nowrap px-3 py-1.5 text-sm"
        onClick={save}
        disabled={isPending || !date}
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-sm"
        onClick={() => setOpen(false)}
        disabled={isPending}
      >
        Cancel
      </button>
    </div>
  );
}
