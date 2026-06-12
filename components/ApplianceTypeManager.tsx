"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApplianceType } from "@prisma/client";
import {
  addApplianceType,
  renameApplianceType,
  deleteApplianceType,
} from "@/lib/appliance-type-actions";

export function ApplianceTypeManager({ types }: { types: ApplianceType[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong");
      else router.refresh();
    });
  };

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => {
      const res = await addApplianceType(name);
      if (res.ok) setNewName("");
      return res;
    });
  };

  return (
    <div className="space-y-4">
      {/* Add */}
      <div className="card p-4">
        <label className="label" htmlFor="newType">
          Add an appliance type
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="newType"
            className="input"
            placeholder="e.g. Twin Block"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className="btn-primary whitespace-nowrap"
            onClick={add}
            disabled={isPending || !newName.trim()}
          >
            + Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>

      {/* List */}
      <div className="card divide-y divide-slate-100">
        {types.length === 0 ? (
          <p className="p-4 text-center text-slate-500">
            No appliance types yet. Add one above.
          </p>
        ) : (
          types.map((t) => (
            <TypeRow
              key={t.id}
              type={t}
              disabled={isPending}
              onRename={(name) =>
                run(() => renameApplianceType(t.id, name))
              }
              onDelete={() => run(() => deleteApplianceType(t.id))}
            />
          ))
        )}
      </div>
      <p className="text-sm text-slate-500">
        Removing a type only takes it off the picker — appliances already
        recorded with that type are not changed.
      </p>
    </div>
  );
}

function TypeRow({
  type,
  disabled,
  onRename,
  onDelete,
}: {
  type: ApplianceType;
  disabled: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(type.name);
  const dirty = name.trim() !== type.name && name.trim().length > 0;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <input
        className="input flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) onRename(name.trim());
        }}
      />
      {dirty && (
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-sm"
          disabled={disabled}
          onClick={() => onRename(name.trim())}
        >
          Save
        </button>
      )}
      <button
        type="button"
        className="px-2 py-1.5 text-sm text-red-600 hover:underline"
        disabled={disabled}
        onClick={() => {
          if (confirm(`Remove "${type.name}" from the appliance list?`)) {
            onDelete();
          }
        }}
      >
        Remove
      </button>
    </div>
  );
}
