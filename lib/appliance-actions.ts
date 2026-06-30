"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { parseDateInput } from "./dates";
import { expectedReturnDate } from "./expectedReturn";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/appliances");
  revalidatePath("/report");
}

const applianceSchema = z.object({
  patientFirstName: z.string().trim().min(1, "First name is required"),
  patientLastName: z.string().trim().min(1, "Last name is required"),
  labId: z.string().min(1, "Lab is required"),
  applianceType: z.string().trim().min(1, "Appliance type is required"),
  // Dates are optional so partial ("incomplete") entries can be saved.
  dateSent: z.string().optional(),
  deliveryDate: z.string().optional(),
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
  await requireAuth();
  if (!name.trim()) return { ok: false, error: "Lab name is required" };
  const id = await ensureLab(name);
  revalidateAll();
  return { ok: true, id };
}

export async function createAppliance(
  formData: FormData
): Promise<ActionResult> {
  await requireAuth();

  // Allow creating a brand-new lab inline via a "__new__" sentinel.
  let labId = String(formData.get("labId") ?? "");
  const newLabName = String(formData.get("newLabName") ?? "").trim();
  if (labId === "__new__" && newLabName) {
    labId = await ensureLab(newLabName);
  }

  const parsed = applianceSchema.safeParse({
    patientFirstName: formData.get("patientFirstName"),
    patientLastName: formData.get("patientLastName"),
    labId,
    applianceType: formData.get("applianceType"),
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

  const dateSent = data.dateSent ? parseDateInput(data.dateSent) : null;
  const deliveryDate = data.deliveryDate
    ? parseDateInput(data.deliveryDate)
    : null;
  // Expected return is derived from the delivery date (or a manual override).
  // With no delivery date there is no expected return — the entry is INCOMPLETE.
  const expected = data.expectedReturnDate
    ? parseDateInput(data.expectedReturnDate)
    : deliveryDate
    ? expectedReturnDate(deliveryDate)
    : null;
  const receivedDate = data.receivedDate
    ? parseDateInput(data.receivedDate)
    : null;

  // Soft validations — warn but don't block.
  const warnings: string[] = [];
  if (deliveryDate && dateSent && deliveryDate.getTime() < dateSent.getTime()) {
    warnings.push("Delivery date is before the sent date.");
  }
  if (receivedDate && dateSent && receivedDate.getTime() < dateSent.getTime()) {
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
  await requireAuth();

  let labId = String(formData.get("labId") ?? "");
  const newLabName = String(formData.get("newLabName") ?? "").trim();
  if (labId === "__new__" && newLabName) {
    labId = await ensureLab(newLabName);
  }

  const parsed = applianceSchema.safeParse({
    patientFirstName: formData.get("patientFirstName"),
    patientLastName: formData.get("patientLastName"),
    labId,
    applianceType: formData.get("applianceType"),
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

  const deliveryDate = data.deliveryDate
    ? parseDateInput(data.deliveryDate)
    : null;
  const expected = data.expectedReturnDate
    ? parseDateInput(data.expectedReturnDate)
    : deliveryDate
    ? expectedReturnDate(deliveryDate)
    : null;

  await prisma.appliance.update({
    where: { id },
    data: {
      patientFirstName: data.patientFirstName,
      patientLastName: data.patientLastName,
      labId: data.labId,
      applianceType: data.applianceType,
      dateSent: data.dateSent ? parseDateInput(data.dateSent) : null,
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
  await requireAuth();
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
  await requireAuth();
  await prisma.appliance.update({
    where: { id },
    data: { receivedDate: null },
  });
  revalidateAll();
  return { ok: true, id };
}

export async function deleteAppliance(id: string): Promise<ActionResult> {
  await requireAuth();
  await prisma.appliance.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}
