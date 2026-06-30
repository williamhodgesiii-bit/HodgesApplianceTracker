import { prisma } from "./prisma";
import type { Appliance, Lab, Prisma } from "@prisma/client";
import {
  deriveStatus,
  daysOverdue,
  isLateArrival,
  type ApplianceStatus,
} from "./status";
import { toDateInputValue } from "./dates";

/** Serializable shape passed to client components. Dates are YYYY-MM-DD. */
export interface ApplianceDTO {
  id: string;
  patientFirstName: string;
  patientLastName: string;
  labId: string;
  labName: string;
  applianceType: string;
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
      { expectedReturnDate: a.expectedReturnDate, receivedDate: a.receivedDate },
      now
    ),
    daysOverdue:
      a.receivedDate || !a.expectedReturnDate
        ? 0
        : daysOverdue(a.expectedReturnDate, now),
    isLate: isLateArrival(a.expectedReturnDate, a.receivedDate),
  };
}

export interface DashboardData {
  incomplete: ApplianceDTO[];
  overdue: ApplianceDTO[];
  dueSoon: ApplianceDTO[];
  onTrack: ApplianceDTO[];
}

/** Group a set of outstanding DTOs by their derived status. */
function groupByStatus(dtos: ApplianceDTO[]): DashboardData {
  return {
    incomplete: dtos.filter((d) => d.status === "INCOMPLETE"),
    overdue: dtos
      .filter((d) => d.status === "OVERDUE")
      .sort((a, b) => b.daysOverdue - a.daysOverdue),
    dueSoon: dtos.filter((d) => d.status === "DUE_SOON"),
    onTrack: dtos.filter((d) => d.status === "ON_TRACK"),
  };
}

/** Outstanding (not-yet-received) appliances, grouped by derived status. */
export async function getDashboardData(): Promise<DashboardData> {
  const rows = await prisma.appliance.findMany({
    where: { receivedDate: null },
    include: { lab: true },
    // Nulls (incomplete entries) sort last here; they're regrouped in memory.
    orderBy: { expectedReturnDate: "asc" },
  });

  return groupByStatus(rows.map((r) => toDTO(r)));
}

export interface ApplianceFilters {
  q?: string;
  labId?: string;
  status?: ApplianceStatus | "ALL" | "OUTSTANDING";
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
    orderBy: [{ receivedDate: "asc" }, { expectedReturnDate: "asc" }],
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
  return groupByStatus(dtos);
}

export async function getLabs(): Promise<Lab[]> {
  return prisma.lab.findMany({ orderBy: { name: "asc" } });
}

/** Distinct appliance types for autocomplete. */
export async function getApplianceTypes(): Promise<string[]> {
  const rows = await prisma.appliance.findMany({
    select: { applianceType: true },
    distinct: ["applianceType"],
    orderBy: { applianceType: "asc" },
  });
  return rows.map((r) => r.applianceType).filter(Boolean);
}
