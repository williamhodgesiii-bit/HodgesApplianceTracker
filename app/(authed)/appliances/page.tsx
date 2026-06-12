import {
  getAppliances,
  getLabs,
  getApplianceTypes,
  type ApplianceFilters,
} from "@/lib/queries";
import { AppliancesTable } from "@/components/AppliancesTable";
import type { ApplianceStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function AppliancesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const filters: ApplianceFilters = {
    q: sp.q,
    labId: sp.labId,
    status: (sp.status as ApplianceStatus | "ALL" | "OUTSTANDING") ?? "ALL",
    from: sp.from,
    to: sp.to,
  };

  const [appliances, labs, applianceTypes] = await Promise.all([
    getAppliances(filters),
    getLabs(),
    getApplianceTypes(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Appliances</h1>
      <AppliancesTable
        appliances={appliances}
        labs={labs}
        applianceTypes={applianceTypes}
      />
    </div>
  );
}
