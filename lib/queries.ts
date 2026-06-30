import { prisma } from "./prisma";
import type { Appliance, Lab, Prisma } from "@prisma/client";
import {
  deriveStatus,
  daysOverdue,
  isLateArrival,
  type ApplianceStatus,
} from "./status";
import { toDateInputValue, addDays, today } from "./dates";

/** Serializable shape passed to client components. Dates are YYYY-MM-DD. */
export interface ApplianceDTO {
  id: string;
  patientFirstName: string;
  patientLastName: string;
  labId: string;
  labName: string;
  applianceType: string;
  // Null when not yet known — these power the INCOMPLETE status.
  dateSent: string | null;
  deliveryDate: string | null;
  expectedReturnDate: string | null;
  receivedDate: string | null;
  notes: string;
  status: ApplianceStatus;
  daysOverdue: number;
  isLate: boolean;
}

type ApplianceWithLab = Appliance & { lab: Lab };

export function toDTO(a: ApplianceWithLab, now = new Date()): ApplianceDTO {
  return {
    id: a.id,
    patientFirstName: a.patientFirstName,
    patientLastName: a.patientLastName,
    labId: a.labId,
    labName: a.lab.name,
    applianceType: a.applianceType,
    dateSent: a.dateSent ? toDateInputValue(a.dateSent) : null,
    deliveryDate: a.deliveryDate ? toDateInputValue(a.deliveryDate) : null,
    expectedReturnDate: a.expectedReturnDate
      ? toDateInputValue(a.expectedReturnDate)
      : null,
    receivedDate: a.receivedDate ? toDateInputValue(a.receivedDate) : null,
    notes: a.notes,
    status: deriveStatus(
      {
        dateSent: a.dateSent,
        expectedReturnDate: a.expectedReturnDate,
        receivedDate: a.receivedDate,
      },
      now
    ),
    daysOverdue: a.receivedDate ? 0 : daysOverdue(a.expectedReturnDate, now),
    isLate: isLateArrival(a.expectedReturnDate, a.receivedDate),
  };
}

export interface DashboardData {
  incomplete: ApplianceDTO[];
  overdue: ApplianceDTO[];
  dueSoon: ApplianceDTO[];
  onTrack: ApplianceDTO[];
}

/** Stable name sort (last, first) used for the order-less Incomplete bucket. */
function byPatientName(a: ApplianceDTO, b: ApplianceDTO): number {
  return (
    a.patientLastName.localeCompare(b.patientLastName) ||
    a.patientFirstName.localeCompare(b.patientFirstName)
  );
}

/** Outstanding (not-yet-received) appliances, grouped by derived status. */
export async function getDashboardData(): Promise<DashboardData> {
  const rows = await prisma.appliance.findMany({
    where: { receivedDate: null },
    include: { lab: true },
    orderBy: { expectedReturnDate: "asc" },
  });

  const dtos = rows.map((r) => toDTO(r));
  return {
    incomplete: dtos.filter((d) => d.status === "INCOMPLETE").sort(byPatientName),
    overdue: dtos
      .filter((d) => d.status === "OVERDUE")
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
    dueSoon: dtos.filter((d) => d.status === "DUE_SOON"),
    onTrack: dtos.filter((d) => d.status === "ON_TRACK"),
  };
}

export interface ApplianceFilters {
  q?: string;
  labId?: string;
  status?: ApplianceStatus | "ALL" | "OUTSTANDING"; // "OUTSTANDING" = not received (incl. incomplete)
  from?: string; // sent-date range start (YYYY-MM-DD)
  to?: string; // sent-date range end
}

export async function getAppliances(
  filters: ApplianceFilters = {}
): Promise<ApplianceDTO[]> {
  const where: Prisma.ApplianceWhereInput = {};

  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { patientFirstName: { contains: q, mode: "insensitive" } },
      { patientLastName: { contains: q, mode: "insensitive" } },
      { applianceType: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.labId) where.labId = filters.labId;
  if (filters.from || filters.to) {
    where.dateSent = {};
    if (filters.from) where.dateSent.gte = new Date(filters.from);
    if (filters.to) where.dateSent.lte = new Date(filters.to);
  }

  const rows = await prisma.appliance.findMany({
    where,
    include: { lab: true },
    // Outstanding (receivedDate = null) first, soonest expected at the top;
    // already-received appliances sort to the bottom.
    orderBy: [
      { receivedDate: { sort: "asc", nulls: "first" } },
      { expectedReturnDate: "asc" },
    ],
  });

  let dtos = rows.map((r) => toDTO(r));

  // Status is derived, so filter it in memory.
  if (filters.status && filters.status !== "ALL") {
    if (filters.status === "OUTSTANDING") {
      dtos = dtos.filter((d) => d.status !== "RECEIVED");
    } else {
      dtos = dtos.filter((d) => d.status === filters.status);
    }
  }

  return dtos;
}

/** Outstanding appliances grouped by status, honoring lab + date filters. */
export async function getReportData(
  filters: ApplianceFilters = {}
): Promise<DashboardData> {
  const dtos = await getAppliances({ ...filters, status: "OUTSTANDING" });
  return {
    incomplete: dtos.filter((d) => d.status === "INCOMPLETE").sort(byPatientName),
    overdue: dtos
      .filter((d) => d.status === "OVERDUE")
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
    dueSoon: dtos.filter((d) => d.status === "DUE_SOON"),
    onTrack: dtos.filter((d) => d.status === "ON_TRACK"),
  };
}

/** How many appliances were marked received in the last `days` days. */
export async function getReceivedRecentCount(days = 7): Promise<number> {
  const start = addDays(today(), -(days - 1));
  return prisma.appliance.count({
    where: { receivedDate: { gte: start } },
  });
}

export async function getLabs(): Promise<Lab[]> {
  return prisma.lab.findMany({ orderBy: { name: "asc" } });
}

/** Total number of appliance records (used by the Settings clear-data panel). */
export async function getApplianceCount(): Promise<number> {
  return prisma.appliance.count();
}

/**
 * Appliance-type options for the Add/Edit dropdown: the managed (active) list
 * first, in its configured order, followed by any historical types still in use
 * that aren't in the managed list (so old/imported data stays selectable).
 */
export async function getApplianceTypes(): Promise<string[]> {
  const [managed, used] = await Promise.all([
    prisma.applianceType.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
    }),
    prisma.appliance.findMany({
      select: { applianceType: true },
      distinct: ["applianceType"],
      orderBy: { applianceType: "asc" },
    }),
  ]);

  const names = managed.map((m) => m.name);
  const seen = new Set(names.map((n) => n.toLowerCase()));
  for (const r of used) {
    const t = r.applianceType?.trim();
    if (t && !seen.has(t.toLowerCase())) {
      names.push(t);
      seen.add(t.toLowerCase());
    }
  }
  return names;
}

/** Full managed appliance-type rows for the Settings screen. */
export async function getManagedApplianceTypes() {
  return prisma.applianceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
