import { ImportWizard } from "@/components/ImportWizard";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Spreadsheet</h1>
        <p className="text-slate-500">
          Upload your existing .xlsx. Every monthly sheet is parsed and delivery
          dates are pulled from the Notes column. Review flagged rows before
          committing.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
