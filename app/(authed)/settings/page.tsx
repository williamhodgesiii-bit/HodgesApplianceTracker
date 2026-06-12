import { getManagedApplianceTypes } from "@/lib/queries";
import { ApplianceTypeManager } from "@/components/ApplianceTypeManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const types = await getManagedApplianceTypes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-slate-500">
          Manage the appliance list used when adding a case.
        </p>
      </div>

      <section className="max-w-2xl space-y-3">
        <h2 className="text-lg font-semibold">Appliance types</h2>
        <ApplianceTypeManager types={types} />
      </section>
    </div>
  );
}
