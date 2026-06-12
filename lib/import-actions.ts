"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { auth } from "./auth";
import { parseWorkbook, type ImportPreview, type ImportRow } from "./import";
import { ensureLab } from "./appliance-actions";
import { parseDateInput } from "./dates";
import { expectedReturnDate } from "./expectedReturn";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
}

export async function parseImport(
  formData: FormData
): Promise<{ ok: boolean; error?: string; preview?: ImportPreview }> {
  await requireAuth();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose an .xlsx file to import." };
  }
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fallbackYear = new Date().getFullYear();
    const preview = parseWorkbook(buffer, fallbackYear);
    if (preview.totalRows === 0) {
      return {
        ok: false,
        error:
          "No data rows found. Make sure the sheet has LAB, LAST NAME, FIRST NAME, SENT, RECEIVED and Notes columns.",
      };
    }
    return { ok: true, preview };
  } catch (e) {
    return {
      ok: false,
      error: `Could not read the file: ${(e as Error).message}`,
    };
  }
}

export interface CommitResult {
  ok: boolean;
  error?: string;
  imported: number;
  skipped: number;
}

export async function commitImport(rows: ImportRow[]): Promise<CommitResult> {
  await requireAuth();

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.include) {
      skipped += 1;
      continue;
    }
    // Required fields must be present to commit.
    if (
      !row.lab.trim() ||
      !row.firstName.trim() ||
      !row.lastName.trim() ||
      !row.dateSent ||
      !row.deliveryDate
    ) {
      skipped += 1;
      continue;
    }

    const labId = await ensureLab(row.lab);
    const deliveryDate = parseDateInput(row.deliveryDate);
    const expected = row.expectedReturnDate
      ? parseDateInput(row.expectedReturnDate)
      : expectedReturnDate(deliveryDate);

    await prisma.appliance.create({
      data: {
        patientFirstName: row.firstName.trim(),
        patientLastName: row.lastName.trim(),
        labId,
        applianceType: row.applianceType?.trim() || "(imported)",
        dateSent: parseDateInput(row.dateSent),
        deliveryDate,
        expectedReturnDate: expected,
        receivedDate: row.receivedDate
          ? parseDateInput(row.receivedDate)
          : null,
        notes: row.notes ?? "",
      },
    });
    imported += 1;
  }

  revalidatePath("/");
  revalidatePath("/appliances");
  revalidatePath("/report");

  return { ok: true, imported, skipped };
}
