import Link from "next/link";

import { EngineControlPanel } from "@/src/components/patricians/EngineControlPanel";
import { requireAuth } from "@/src/lib/auth/requireAuth";
import { getDashboardData } from "@/src/lib/data/patricians";
import { engineControlAvailability } from "@/src/lib/engine/runner";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default async function PatriciansDashboardPage() {
  const session = await requireAuth();
  const canApprove = session.role === "approver" || session.role === "admin";
  const data = await getDashboardData();
  const runDate = new Date().toISOString().slice(0, 10);
  const engineControl = engineControlAvailability();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr_1.4fr]">
      <aside className="space-y-3">
        <section className="helix-panel rounded-2xl p-4">
          <h2 className="helix-display mb-3 text-base font-semibold uppercase tracking-wide text-[#566173]">Side Stats</h2>
          <div className="space-y-2 text-sm text-[#485366]">
            <p className="flex justify-between">
              <span>Total Value</span>
              <strong>{formatMoney(data.totals.totalValue)}</strong>
            </p>
            <p className="flex justify-between">
              <span>Cash %</span>
              <strong>{data.totals.cashPct.toFixed(2)}%</strong>
            </p>
            <p className="flex justify-between">
              <span>Today P/L</span>
              <strong className={data.totals.todayPL >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatMoney(data.totals.todayPL)}
              </strong>
            </p>
            <p className="flex justify-between">
              <span>All-Time P/L</span>
              <strong className={data.totals.allTimePL >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {formatMoney(data.totals.allTimePL)}
              </strong>
            </p>
            <p className="flex justify-between">
              <span>Drawdown</span>
              <strong>{data.totals.drawdown.toFixed(2)}%</strong>
            </p>
          </div>
        </section>

        <section className="helix-panel rounded-2xl p-4">
          <h2 className="helix-display mb-2 text-base font-semibold uppercase tracking-wide text-[#566173]">Exposure</h2>
          {data.exposureSummary.length === 0 ? (
            <p className="text-sm text-slate-500">No open exposure.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[#485366]">
              {data.exposureSummary.slice(0, 6).map((item) => (
                <li key={item.symbol} className="flex justify-between">
                  <span>{item.symbol}</span>
                  <span>{item.pct.toFixed(2)}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="helix-panel rounded-2xl p-4 text-sm text-[#485366]">
          <h2 className="helix-display mb-2 text-base font-semibold uppercase tracking-wide text-[#566173]">Next Runs</h2>
          <p>Propose: {data.nextRunHints.propose}</p>
          <p>Execute: {data.nextRunHints.execute}</p>
          <p>Train: {data.nextRunHints.train}</p>
        </section>
      </aside>

      <section className="space-y-3">
        {canApprove ? (
          <EngineControlPanel
            defaultRunDate={runDate}
            canRun={engineControl.enabled}
            mode={engineControl.mode}
          />
        ) : null}
        <h2 className="helix-display text-2xl font-semibold helix-title">Investor Hub</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.investorCards.map((card) => (
            <Link
              key={card.id}
              href={`/patricians/investors/${card.code}`}
              className="helix-panel rounded-2xl p-4 transition hover:border-[#bcc1ca]"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="helix-display text-2xl font-semibold helix-title">{card.name}</h3>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    card.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : card.status === "paused"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {card.status}
                </span>
              </div>
              <p className="text-sm text-[#586375]">Sleeve Value: {formatMoney(card.sleeveValue)}</p>
              <p className="text-sm text-[#586375]">Open Positions: {card.openPositionsCount}</p>
              <p className="text-sm text-[#586375]">Pending Requests: {card.pendingRequestsCount}</p>
            </Link>
          ))}
        </div>
      </section>

      <aside className="space-y-3">
        <section className="helix-panel rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="helix-display text-base font-semibold uppercase tracking-wide text-[#566173]">
              Pending Approval Queue
            </h2>
            {canApprove ? (
              <Link href="/patricians/approvals" className="text-xs text-[#4f5a6c] underline">
                Open
              </Link>
            ) : null}
          </div>
          {!canApprove ? (
            <p className="text-sm text-slate-500">Approver/Admin role required.</p>
          ) : data.pendingQueue.length === 0 ? (
            <p className="text-sm text-slate-500">No pending requests.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[#485366]">
              {data.pendingQueue.slice(0, 8).map((item) => (
                <li key={item.id} className="helix-soft rounded-md px-2 py-1">
                  <p className="font-medium">
                    {item.investorCode.toUpperCase()} {item.action.toUpperCase()} {item.symbol}
                  </p>
                  <p className="text-xs text-slate-500">Target {item.targetPct.toFixed(2)}%</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="helix-panel rounded-2xl p-4">
          <h2 className="helix-display mb-2 text-base font-semibold uppercase tracking-wide text-[#566173]">Recent Requests / Trades</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="space-y-2 text-sm text-[#485366]">
              {data.recentActivity.map((event) => (
                <li key={`${event.type}-${event.id}`} className="helix-soft rounded-md px-2 py-1">
                  <p className="font-medium">{event.type.toUpperCase()}</p>
                  <p>{event.text}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
