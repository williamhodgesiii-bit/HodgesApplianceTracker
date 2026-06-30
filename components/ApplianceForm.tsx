"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Lab } from "@prisma/client";
import {
  createAppliance,
  updateAppliance,
  type ActionResult,
} from "@/lib/appliance-actions";
import { computeExpectedReturn } from "@/lib/expectedReturn";
import { parseDateInput, toDateInputValue, formatInput } from "@/lib/dates";
import type { ApplianceDTO } from "@/lib/queries";

interface Props {
  labs: Lab[];
  applianceTypes: string[];
  mode: "create" | "edit";
  initial?: ApplianceDTO;
  onDone?: () => void;
}

const todayValue = () => toDateInputValue(new Date());

export function ApplianceForm({
  labs,
  applianceTypes,
  mode,
  initial,
  onDone,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? "");
  const [overrideExpected, setOverrideExpected] = useState(false);
  const [expectedManual, setExpectedManual] = useState(
    initial?.expectedReturnDate ?? ""
  );
  const [labId, setLabId] = useState(initial?.labId ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);

  // Live expected-return calculation as the delivery date changes.
  const computed = useMemo(() => {
    if (!deliveryDate) return null;
    try {
      return computeExpectedReturn(parseDateInput(deliveryDate));
    } catch {
      return null;
    }
  }, [deliveryDate]);

  const expectedValue =
    overrideExpected && expectedManual
      ? expectedManual
      : computed
      ? toDateInputValue(computed.date)
      : "";

  const handleSubmit = (formData: FormData) => {
    // Ensure the (possibly auto-computed) expected date is submitted.
    if (overrideExpected && expectedManual) {
      formData.set("expectedReturnDate", expectedManual);
    } else {
      formData.delete("expectedReturnDate"); // let the server compute it
    }
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createAppliance(formData)
          : await updateAppliance(initial!.id, formData);
      setResult(res);
      if (res.ok) {
        if (mode === "create" && !res.warning) {
          formRef.current?.reset();
          setDeliveryDate("");
          setOverrideExpected(false);
          setExpectedManual("");
          setLabId("");
        }
        router.refresh();
        if (mode === "edit") onDone?.();
        if (mode === "create" && res.warning) {
          // keep values so the user can see the warning; do not clear
        }
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="patientFirstName">
            Patient first name
          </label>
          <input
            id="patientFirstName"
            name="patientFirstName"
            className="input"
            required
            autoFocus={mode === "create"}
            defaultValue={initial?.patientFirstName ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="patientLastName">
            Patient last name
          </label>
          <input
            id="patientLastName"
            name="patientLastName"
            className="input"
            required
            defaultValue={initial?.patientLastName ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="labId">
            Lab
          </label>
          <select
            id="labId"
            name="labId"
            className="input"
            required
            value={labId}
            onChange={(e) => setLabId(e.target.value)}
          >
            <option value="" disabled>
              Select a lab…
            </option>
            {labs.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name}
              </option>
            ))}
            <option value="__new__">➕ Add new lab…</option>
          </select>
          {labId === "__new__" && (
            <input
              name="newLabName"
              className="input mt-2"
              placeholder="New lab name"
              autoFocus
            />
          )}
        </div>
        <div>
          <label className="label" htmlFor="applianceType">
            Appliance type
          </label>
          <input
            id="applianceType"
            name="applianceType"
            className="input"
            required
            list="appliance-types"
            defaultValue={initial?.applianceType ?? ""}
            placeholder="e.g. Retainer, Expander"
          />
          <datalist id="appliance-types">
            {applianceTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="dateSent">
            Date sent <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="dateSent"
            name="dateSent"
            type="date"
            className="input"
            defaultValue={
              initial?.dateSent ?? (mode === "create" ? todayValue() : "")
            }
          />
        </div>
        <div>
          <label className="label" htmlFor="deliveryDate">
            Delivery date (DD — patient&apos;s appointment){" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="deliveryDate"
            name="deliveryDate"
            type="date"
            className="input"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* Live expected-return preview */}
      <div
        className={`rounded-lg border p-3 ${
          deliveryDate || overrideExpected
            ? "border-blue-200 bg-blue-50"
            : "border-orange-200 bg-orange-50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-sm font-medium text-slate-600">
              Expected back in office:
            </span>{" "}
            <span className="text-lg font-bold text-blue-800">
              {expectedValue ? formatInput(expectedValue) : "—"}
            </span>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={overrideExpected}
              onChange={(e) => {
                setOverrideExpected(e.target.checked);
                if (e.target.checked && !expectedManual) {
                  setExpectedManual(expectedValue);
                }
              }}
            />
            Override
          </label>
        </div>
        {computed && !overrideExpected && (
          <p className="mt-1 text-sm text-slate-500">{computed.explanation}</p>
        )}
        {!deliveryDate && !overrideExpected && (
          <p className="mt-1 text-sm text-orange-700">
            🟠 No delivery date yet — this will be saved as{" "}
            <strong>Incomplete</strong> and pinned to the top of the dashboard
            until you add one.
          </p>
        )}
        {overrideExpected && (
          <input
            type="date"
            className="input mt-2"
            value={expectedManual}
            onChange={(e) => setExpectedManual(e.target.value)}
          />
        )}
      </div>

      {mode === "edit" && (
        <div>
          <label className="label" htmlFor="receivedDate">
            Received date (leave blank if not yet received)
          </label>
          <input
            id="receivedDate"
            name="receivedDate"
            type="date"
            className="input"
            defaultValue={initial?.receivedDate ?? ""}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          className="input"
          rows={2}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      {result?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      )}
      {result?.warning && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ Saved with a warning: {result.warning}
        </p>
      )}
      {result?.ok && !result.warning && mode === "create" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          ✓ Appliance added.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending
            ? "Saving…"
            : mode === "create"
            ? "Add Appliance"
            : "Save Changes"}
        </button>
        {mode === "edit" && onDone && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onDone}
            disabled={isPending}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
