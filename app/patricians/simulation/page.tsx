import { SimulationChart } from "@/src/components/patricians/SimulationChart";
import { SimulationInputForm } from "@/src/components/patricians/SimulationInputForm";
import { requireAuth } from "@/src/lib/auth/requireAuth";
import { getSimulationData } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default async function SimulationPage() {
  await requireAuth();
  const data = await getSimulationData();

  const today = new Date().toISOString().slice(0, 10);
  const latest = data.latest;

  return (
    <div className="space-y-4">
      <section className="helix-panel rounded-2xl p-4">
        <h1 className="mb-1 text-3xl">Simulation Exchange</h1>
        <p className="text-sm text-[#5f6b7d]">
          Manual simulation board for tracking Alpha/Beta/Gamma sleeve equity over time using real
          market context.
        </p>
      </section>

      {!data.tableReady ? (
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="mb-2 text-2xl">Setup Required</h2>
          <p className="text-sm text-rose-700">
            Run `supabase/simulation_snapshots_migration.sql` in your Supabase SQL editor before
            using this page.
          </p>
          <p className="mt-2 text-xs text-[#6c7787]">{data.tableError}</p>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="mb-2 text-lg">Latest Total</h2>
          <p className="text-2xl font-semibold">{formatMoney(latest?.total ?? 0)}</p>
          <p className="text-xs text-[#6a7483]">{latest?.date ?? "No snapshots yet"}</p>
        </section>
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="mb-2 text-lg">Alpha / Beta / Gamma</h2>
          <p className="text-sm text-[#4b5566]">
            A {formatMoney(latest?.alpha ?? 0)} | B {formatMoney(latest?.beta ?? 0)} | G{" "}
            {formatMoney(latest?.gamma ?? 0)}
          </p>
          <p className="text-xs text-[#6a7483]">Last manual snapshot values</p>
        </section>
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="mb-2 text-lg">Live Mark Suggestion</h2>
          <p className="text-sm text-[#4b5566]">
            A {formatMoney(data.liveSuggestion.alpha)} | B {formatMoney(data.liveSuggestion.beta)} | G{" "}
            {formatMoney(data.liveSuggestion.gamma)}
          </p>
          <p className="text-xs text-[#6a7483]">Calculated from open positions x latest closes</p>
        </section>
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="mb-2 text-lg">SPY Benchmark</h2>
          <p className="text-sm text-[#4b5566]">Normalized line is shown on the chart.</p>
          <p className="text-xs text-[#6a7483]">
            Helps compare sleeve performance against broad market direction.
          </p>
        </section>
      </div>

      <SimulationChart points={data.chartPoints} />

      {data.tableReady ? (
        <SimulationInputForm
          defaultDate={today}
          defaultAlpha={data.liveSuggestion.alpha}
          defaultBeta={data.liveSuggestion.beta}
          defaultGamma={data.liveSuggestion.gamma}
        />
      ) : null}
    </div>
  );
}

