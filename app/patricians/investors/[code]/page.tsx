import { notFound } from "next/navigation";

import { getOptionalSession } from "@/src/lib/auth/requireAuth";
import { getInvestorDetail } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getOptionalSession();
  if (!session) {
    return null;
  }
  const resolved = await params;
  const detail = await getInvestorDetail(resolved.code);
  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <section className="helix-panel rounded-2xl p-4">
        <h1 className="text-3xl">
          {detail.investor.name} ({detail.investor.code.toUpperCase()})
        </h1>
        <p className="mt-1 text-sm text-[#566173]">Status: {detail.investor.status}</p>
        <p className="text-sm text-[#566173]">Sleeve Budget: {detail.investor.riskBudgetPct.toFixed(2)}%</p>
        <div className="mt-3 grid gap-2 text-sm text-[#485366] md:grid-cols-4">
          <p>Latest Total: {formatMoney(detail.stats.latestTotalValue)}</p>
          <p>Latest Cash: {formatMoney(detail.stats.latestCashValue)}</p>
          <p>Latest Drawdown: {detail.stats.latestDrawdown.toFixed(2)}%</p>
          <p>Period Change: {formatMoney(detail.stats.periodChange)}</p>
        </div>
      </section>

      <section className="helix-panel rounded-2xl p-4">
        <h2 className="mb-3 text-2xl">Open Positions</h2>
        {detail.positions.length === 0 ? (
          <p className="text-sm text-[#667183]">No positions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#485366]">
              <thead className="text-[#6b7584]">
                <tr>
                  <th className="px-2 py-1">Symbol</th>
                  <th className="px-2 py-1">Qty</th>
                  <th className="px-2 py-1">Avg Price</th>
                  <th className="px-2 py-1">Mark</th>
                  <th className="px-2 py-1">Value</th>
                  <th className="px-2 py-1">Updated</th>
                </tr>
              </thead>
              <tbody>
                {detail.positions.map((position) => (
                  <tr key={position.id} className="border-t border-[var(--helix-border)]/75">
                    <td className="px-2 py-1">{position.symbol}</td>
                    <td className="px-2 py-1">{position.qty.toFixed(4)}</td>
                    <td className="px-2 py-1">{position.avgPrice.toFixed(2)}</td>
                    <td className="px-2 py-1">{position.markPrice.toFixed(2)}</td>
                    <td className="px-2 py-1">{formatMoney(position.value)}</td>
                    <td className="px-2 py-1">{new Date(position.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="helix-panel rounded-2xl p-4">
        <h2 className="mb-3 text-2xl">Request History</h2>
        {detail.requests.length === 0 ? (
          <p className="text-sm text-[#667183]">No request history.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#485366]">
              <thead className="text-[#6b7584]">
                <tr>
                  <th className="px-2 py-1">Created</th>
                  <th className="px-2 py-1">Symbol</th>
                  <th className="px-2 py-1">Action</th>
                  <th className="px-2 py-1">Target</th>
                  <th className="px-2 py-1">State</th>
                  <th className="px-2 py-1">Engine</th>
                </tr>
              </thead>
              <tbody>
                {detail.requests.map((request) => (
                  <tr key={request.id} className="border-t border-[var(--helix-border)]/75">
                    <td className="px-2 py-1">{new Date(request.created_at).toLocaleString()}</td>
                    <td className="px-2 py-1">{request.symbol}</td>
                    <td className="px-2 py-1">{request.action}</td>
                    <td className="px-2 py-1">{Number(request.target_pct).toFixed(2)}%</td>
                    <td className="px-2 py-1">{request.state}</td>
                    <td className="px-2 py-1">{request.engine_version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
