import { updateTreasuryRulesAction } from "@/app/patricians/rules/actions";
import { getOptionalSession } from "@/src/lib/auth/requireAuth";
import { WorkerStartPanel } from "@/src/components/patricians/WorkerStartPanel";
import { getTreasuryRules } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const session = await getOptionalSession();
  const canApprove = session?.role === "approver" || session?.role === "admin";
  if (!canApprove) {
    return (
      <section className="helix-panel max-w-xl rounded-2xl p-4">
        <h1 className="text-3xl">Rules Locked</h1>
        <p className="mt-2 text-sm text-[#5c6879]">
          Approver/Admin role is required to update treasury rules.
        </p>
      </section>
    );
  }

  const rules = await getTreasuryRules();

  return (
    <section className="helix-panel max-w-xl rounded-2xl p-4">
      <h1 className="mb-2 text-3xl">Settings</h1>
      <p className="mb-4 text-sm text-[#566173]">Configure treasury behavior and local engine controls.</p>

      <h2 className="mb-2 text-xl">Treasury Rules</h2>
      <p className="mb-4 text-sm text-[#566173]">Profit siphon and reinvest settings are tracked in simulation only for v0.</p>

      <form action={updateTreasuryRulesAction} className="space-y-3">
        <label className="block text-sm font-semibold text-[#495467]">
          Profit Siphon %
          <input
            name="profit_siphon_pct"
            type="number"
            min="0"
            max="1"
            step="0.01"
            defaultValue={rules.profitSiphonPct}
            className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block text-sm font-semibold text-[#495467]">
          Reinvest %
          <input
            name="reinvest_pct"
            type="number"
            min="0"
            max="1"
            step="0.01"
            defaultValue={rules.reinvestPct}
            className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            required
          />
        </label>

        <button type="submit" className="helix-btn rounded-md px-4 py-2 text-sm font-semibold">
          Update Rules
        </button>
      </form>

      <p className="mt-4 text-xs text-[#6b7584]">
        Last updated: {rules.updatedAt ? new Date(rules.updatedAt).toLocaleString() : "never"}
      </p>

      <WorkerStartPanel />
    </section>
  );
}
