import { getLabs, getApplianceTypes } from "@/lib/queries";
import { ApplianceForm } from "@/components/ApplianceForm";

export const dynamic = "force-dynamic";

export default async function AddPage() {
  const [labs, applianceTypes] = await Promise.all([
    getLabs(),
    getApplianceTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Appliance</h1>
        <p className="text-slate-500">
          Enter the case details. The expected return date fills in
          automatically — you can override it.
        </p>
      </div>
      <div className="card max-w-3xl p-6">
        <ApplianceForm
          labs={labs}
          applianceTypes={applianceTypes}
          mode="create"
        />
      </div>
    </div>
  );
}
