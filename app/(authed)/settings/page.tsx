import {
  getManagedApplianceTypes,
  getLabs,
  getApplianceCount,
} from "@/lib/queries";
import { ApplianceTypeManager } from "@/components/ApplianceTypeManager";
import { LabManager } from "@/components/LabManager";
import { ClearDataPanel } from "@/components/ClearDataPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [types, labs, applianceCount] = await Promise.all([
    getManagedApplianceTypes(),
    getLabs(),
    getApplianceCount(),
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="text-sm text-slate-500">
          Clear out the sample/test appliances so you can start entering real
          cases. Your labs and appliance types are kept.
        </p>
        <ClearDataPanel count={applianceCount} />
      </section>
    </div>
  );
}
