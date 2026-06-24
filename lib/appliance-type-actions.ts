"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import type { ActionResult } from "./appliance-actions";

function revalidate() {
  revalidatePath("/settings");
  revalidatePath("/add");
  revalidatePath("/appliances");
}

/**
 * Find or create an appliance type by name (case-insensitive). Reactivates a
 * previously-removed type with the same name. Returns the canonical name.
 */
export async function ensureApplianceType(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const existing = await prisma.applianceType.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) {
    if (!existing.active) {
      await prisma.applianceType.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return existing.name;
  }
  const max = await prisma.applianceType.aggregate({
    _max: { sortOrder: true },
  });
  const created = await prisma.applianceType.create({
    data: { name: trimmed, sortOrder: (max._max.sortOrder ?? 0) + 10 },
  });
  return created.name;
}

export async function addApplianceType(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Type name is required" };
  await ensureApplianceType(trimmed);
  revalidate();
  return { ok: true };
}

export async function renameApplianceType(
  id: string,
  name: string
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Type name is required" };
  const clash = await prisma.applianceType.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" }, id: { not: id } },
  });
  if (clash) return { ok: false, error: "Another type already has that name" };
  await prisma.applianceType.update({
    where: { id },
    data: { name: trimmed },
  });
  revalidate();
  return { ok: true };
}

/** Remove a type from the picker. Existing appliance records are unaffected. */
export async function deleteApplianceType(id: string): Promise<ActionResult> {
  await prisma.applianceType.delete({ where: { id } });
  revalidate();
  return { ok: true };
}
