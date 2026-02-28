import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="min-h-screen px-4 py-10">
      <main className="mx-auto w-full max-w-6xl">
        <section className="helix-panel rounded-3xl px-8 py-14 text-center">
          <p className="helix-display text-sm uppercase tracking-[0.26em] helix-accent">Helix R&D</p>
          <h1 className="mt-4 text-6xl">Patricians</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-[#546073]">
            HPRG-0007 is a simulation-first multi-investor decision system affiliated with Helix.
            It runs Alpha, Beta, and Gamma sleeves with approval controls, execution logging, and
            audit-grade ledger visibility.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="helix-btn rounded-md px-5 py-2 font-semibold">
              Member Login
            </Link>
            <Link href="/patricians" className="helix-btn rounded-md px-5 py-2 font-semibold">
              Open Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="helix-panel rounded-2xl p-5">
            <h2 className="text-3xl">Simulation Source of Truth</h2>
            <p className="mt-2 text-sm text-[#5c6879]">
              All decisions, approvals, and fills are recorded in simulated mode first, with real
              trade mirroring deferred to manual workflows.
            </p>
          </article>
          <article className="helix-panel rounded-2xl p-5">
            <h2 className="text-3xl">Governance and Risk</h2>
            <p className="mt-2 text-sm text-[#5c6879]">
              Engine proposals pass through human approvals and hard risk checks before execution at
              next market open.
            </p>
          </article>
          <article className="helix-panel rounded-2xl p-5">
            <h2 className="text-3xl">Helix Affiliation</h2>
            <p className="mt-2 text-sm text-[#5c6879]">
              Patricians is operated under Helix research conventions with traceable data lineage,
              explicit controls, and periodic optimization.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
