"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Lab } from "@prisma/client";
import {
  createAppliance,
  updateAppliance,
  type ActionResult,
} from "@/lib/appliance-actions";
import { computeExpectedReturn } from "@/lib/expectedReturn";
import { parseDateInput, toDateInputValue, relativeFromInput } from "@/lib/dates";
import type { ApplianceDTO } from "@/lib/queries";

interface Props {
  labs: Lab[];
  applianceTypes: string[];
  mode: "create" | "edit";
  initial?: ApplianceDTO;
  onDone?: () => void;
}

const todayValue = () => toDateInputValue(new Date());

function autoExpected(deliveryDate: string): string {
  if (!deliveryDate) return "";
  try {
    return toDateInputValue(
      computeExpectedReturn(parseDateInput(deliveryDate)).date
    );
  } catch {
    return "";
  }
}

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
  const [labId, setLabId] = useState(initial?.labId ?? "");
  const [applianceType, setApplianceType] = useState(
    initial?.applianceType ?? ""
  );
  const [expected, setExpected] = useState(initial?.expectedReturnDate ?? "");
  // Once the user hand-edits expected, stop auto-syncing it to delivery.
  const [expectedTouched, setExpectedTouched] = useState(mode === "edit");
  const [result, setResult] = useState<ActionResult | null>(null);

  // Auto-fill the expected date from delivery until the user takes it over.
  useEffect(() => {
    if (!expectedTouched) setExpected(autoExpected(deliveryDate));
  }, [deliveryDate, expectedTouched]);

  // In edit mode, make sure a historical type still appears as an option.
  const typeOptions =
    initial?.applianceType && !applianceTypes.includes(initial.applianceType)
      ? [initial.applianceType, ...applianceTypes]
      : applianceTypes;

  const isAutoExpected = expected === autoExpected(deliveryDate);

  const resetExpectedToAuto = () => {
    setExpectedTouched(false);
    setExpected(autoExpected(deliveryDate));
  };

  const handleSubmit = (formData: FormData) => {
    formData.set("expectedReturnDate", expected);
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
          setLabId("");
          setApplianceType("");
          setExpected("");
          setExpectedTouched(false);
        }
        router.refresh();
        if (mode === "edit") onDone?.();
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
            Appliance
          </label>
          <select
            id="applianceType"
            name="applianceType"
            className="input"
            required
            value={applianceType}
            onChange={(e) => setApplianceType(e.target.value)}
          >
            <option value="" disabled>
              Select an appliance…
            </option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__new__">➕ Add new appliance type…</option>
          </select>
          {applianceType === "__new__" && (
            <input
              name="newApplianceTypeName"
              className="input mt-2"
              placeholder="New appliance type"
              autoFocus
            />
          )}
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
            defaultValue={initial ? initial.dateSent ?? "" : todayValue()}
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

      <p className="text-xs text-slate-500">
        Leave a date blank if you don&apos;t have it yet — the case is saved as{" "}
        <span className="font-semibold text-indigo-700">📝 Incomplete</span> and
        shown at the top of the dashboard until it&apos;s filled in.
      </p>

      {/* Expected return — auto-filled (4 days before delivery), fully editable */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[12rem] flex-1">
            <label
              className="label flex items-center justify-between"
              htmlFor="expectedReturnDate"
            >
              <span>Expected back in office</span>
              {!isAutoExpected && deliveryDate && (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-700 hover:underline"
                  onClick={resetExpectedToAuto}
                >
                  Reset to auto
                </button>
              )}
            </label>
            <input
              id="expectedReturnDate"
              type="date"
              className="input"
              value={expected}
              onChange={(e) => {
                setExpected(e.target.value);
                setExpectedTouched(true);
              }}
            />
          </div>
          <div className="pb-2 text-sm text-slate-600">
            {expected ? (
              <>
                <span className="font-semibold text-blue-800">
                  {relativeFromInput(expected)}
                </span>
                {isAutoExpected && (
                  <span className="ml-1 text-slate-500">
                    · auto (4 days before delivery)
                  </span>
                )}
              </>
            ) : (
              "Pick a delivery date to auto-fill."
            )}
          </div>
        </div>
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
