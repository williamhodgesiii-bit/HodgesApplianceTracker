"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { parseDateInput } from "./dates";
import { expectedReturnDate } from "./expectedReturn";
import { ensureApplianceType } from "./appliance-type-actions";

/** Resolve the appliance type, creating a new managed type when requested. */
async function resolveApplianceType(formData: FormData): Promise<string> {
  const selected = String(formData.get("applianceType") ?? "");
  const newName = String(formData.get("newApplianceTypeName") ?? "").trim();
  if (selected === "__new__" && newName) {
    return ensureApplianceType(newName);
  }
  return selected;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/appliances");
  revalidatePath("/report");
  // Keep the Add form's lab/appliance-type dropdowns and the Settings managers
  // in sync when a case inline-creates a new lab or appliance type.
  revalidatePath("/add");
  revalidatePath("/settings");
}

const applianceSchema = z.object({
  patientFirstName: z.string().trim().min(1, "First name is required"),
  patientLastName: z.string().trim().min(1, "Last name is required"),
  labId: z.string().min(1, "Lab is required"),
  applianceType: z.string().trim().min(1, "Appliance type is required"),
  dateSent: z.string().min(1, "Sent date is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  // Optional manual override of the expected return date.
  expectedReturnDate: z.string().optional(),
  receivedDate: z.string().optional(),
  notes: z.string().optional(),
});

export interface ActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
  id?: string;
}

/** Find or create a lab by name (case-insensitive). Returns the lab id. */
export async function ensureLab(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await prisma.lab.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await prisma.lab.create({ data: { name: trimmed } });
  return created.id;
}

export async function addLab(name: string): Promise<ActionResult> {
  if (!name.trim()) return { ok: false, error: "Lab name is required" };
  const id = await ensureLab(name);
  revalidateAll();
  return { ok: true, id };
}

export async function renameLab(id: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Lab name is required" };
  const clash = await prisma.lab.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
  });
  if (clash) return { ok: false, error: "Another lab already has that name" };
  await prisma.lab.update({ where: { id }, data: { name: trimmed } });
  revalidateAll();
  return { ok: true, id };
}

/** Remove a lab. Blocked if any appliance still references it. */
export async function deleteLab(id: string): Promise<ActionResult> {
  const inUse = await prisma.appliance.count({ where: { labId: id } });
  if (inUse > 0) {
    return {
      ok: false,
      error: `This lab is used by ${inUse} appliance${
        inUse === 1 ? "" : "s"
      }. Reassign or remove those first.`,
    };
  }
  await prisma.lab.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

export async function createAppliance(
  formData: FormData
): Promise<ActionResult> {
  // Allow creating a brand-new lab inline via a "__new__" sentinel.
  let labId = String(formData.get("labId") ?? "");
  const newLabName = String(formData.get("newLabName") ?? "").trim();
  if (labId === "__new__" && newLabName) {
    labId = await ensureLab(newLabName);
  }

  const applianceType = await resolveApplianceType(formData);

  const parsed = applianceSchema.safeParse({
    patientFirstName: formData.get("patientFirstName"),
    patientLastName: formData.get("patientLastName"),
    labId,
    applianceType,
    dateSent: formData.get("dateSent"),
    deliveryDate: formData.get("deliveryDate"),
    expectedReturnDate: formData.get("expectedReturnDate") || undefined,
    receivedDate: formData.get("receivedDate") || undefined,
    notes: formData.get("notes") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const dateSent = parseDateInput(data.dateSent);
  const deliveryDate = parseDateInput(data.deliveryDate);
  const expected = data.expectedReturnDate
    ? parseDateInput(data.expectedReturnDate)
    : expectedReturnDate(deliveryDate);
  const receivedDate = data.receivedDate
    ? parseDateInput(data.receivedDate)
    : null;

  // Soft validations — warn but don't block.
  const warnings: string[] = [];
  if (deliveryDate.getTime() < dateSent.getTime()) {
    warnings.push("Delivery date is before the sent date.");
  }
  if (receivedDate && receivedDate.getTime() < dateSent.getTime()) {
    warnings.push("Received date is before the sent date.");
  }
  const dup = await prisma.appliance.findFirst({
    where: {
      patientFirstName: { equals: data.patientFirstName, mode: "insensitive" },
      patientLastName: { equals: data.patientLastName, mode: "insensitive" },
    },
  });
  if (dup) {
    warnings.push(
      `A record for ${data.patientFirstName} ${data.patientLastName} already exists.`
    );
  }

  const created = await prisma.appliance.create({
    data: {
      patientFirstName: data.patientFirstName,
      patientLastName: data.patientLastName,
      labId: data.labId,
      applianceType: data.applianceType,
      dateSent,
      deliveryDate,
      expectedReturnDate: expected,
      receivedDate,
      notes: data.notes ?? "",
    },
  });

  revalidateAll();
  return {
    ok: true,
    id: created.id,
    warning: warnings.length ? warnings.join(" ") : undefined,
  };
}

export async function updateAppliance(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  let labId = String(formData.get("labId") ?? "");
  const newLabName = String(formData.get("newLabName") ?? "").trim();
  if (labId === "__new__" && newLabName) {
    labId = await ensureLab(newLabName);
  }

  const applianceType = await resolveApplianceType(formData);

  const parsed = applianceSchema.safeParse({
    patientFirstName: formData.get("patientFirstName"),
    patientLastName: formData.get("patientLastName"),
    labId,
    applianceType,
    dateSent: formData.get("dateSent"),
    deliveryDate: formData.get("deliveryDate"),
    expectedReturnDate: formData.get("expectedReturnDate") || undefined,
    receivedDate: formData.get("receivedDate") || undefined,
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const deliveryDate = parseDateInput(data.deliveryDate);
  const expected = data.expectedReturnDate
    ? parseDateInput(data.expectedReturnDate)
    : expectedReturnDate(deliveryDate);

  await prisma.appliance.update({
    where: { id },
    data: {
      patientFirstName: data.patientFirstName,
      patientLastName: data.patientLastName,
      labId: data.labId,
      applianceType: data.applianceType,
      dateSent: parseDateInput(data.dateSent),
      deliveryDate,
      expectedReturnDate: expected,
      receivedDate: data.receivedDate
        ? parseDateInput(data.receivedDate)
        : null,
      notes: data.notes ?? "",
    },
  });

  revalidateAll();
  return { ok: true, id };
}

/** Mark an appliance as received. Date defaults to today. */
export async function markReceived(
  id: string,
  receivedDate?: string
): Promise<ActionResult> {
  const date = receivedDate ? parseDateInput(receivedDate) : new Date();
  await prisma.appliance.update({
    where: { id },
    data: { receivedDate: date },
  });
  revalidateAll();
  return { ok: true, id };
}

/** Undo a received mark (set back to outstanding). */
export async function markUnreceived(id: string): Promise<ActionResult> {
  await prisma.appliance.update({
    where: { id },
    data: { receivedDate: null },
  });
  revalidateAll();
  return { ok: true, id };
}

export async function deleteAppliance(id: string): Promise<ActionResult> {
  await prisma.appliance.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

/**
 * Delete EVERY appliance record. Used to clear out sample/test data so the
 * office can start entering real cases. Labs and appliance types are kept.
 */
export async function clearAllAppliances(): Promise<
  ActionResult & { count?: number }
> {
  const { count } = await prisma.appliance.deleteMany({});
  revalidateAll();
  return { ok: true, count };
}
