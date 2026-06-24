import { getManagedApplianceTypes, getLabs } from "@/lib/queries";
import { ApplianceTypeManager } from "@/components/ApplianceTypeManager";
import { LabManager } from "@/components/LabManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [types, labs] = await Promise.all([
    getManagedApplianceTypes(),
    getLabs(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-500">
          Manage the appliance types and labs used when adding a case.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Appliance types</h2>
          <ApplianceTypeManager types={types} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Labs</h2>
          <LabManager labs={labs} />
        </section>
      </div>
    </div>
  );
}
