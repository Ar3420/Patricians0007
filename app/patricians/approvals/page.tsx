import Link from "next/link";

import { submitApprovalAction } from "@/app/patricians/approvals/actions";
import { getOptionalSession } from "@/src/lib/auth/requireAuth";
import { getApprovalsData } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    symbol?: string;
    selected?: string;
  }>;
}) {
  const session = await getOptionalSession();
  const canApprove = session?.role === "approver" || session?.role === "admin";
  if (!canApprove) {
    return (
      <section className="helix-panel rounded-2xl p-5">
        <h1 className="text-3xl">Approvals Locked</h1>
        <p className="mt-2 text-sm text-[#5c6879]">
          Approver/Admin role is required to access this page.
        </p>
      </section>
    );
  }

  const filters = await searchParams;
  const data = await getApprovalsData({
    code: filters.code,
    symbol: filters.symbol,
    selected: filters.selected,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <section className="helix-panel rounded-2xl p-4">
        <h1 className="mb-3 text-3xl">Pending Approval Queue</h1>
        <p className="mb-3 text-xs text-[#6a7486]">
          Approved requests auto-queue simulation execution for this run date when worker mode is `queue`.
        </p>
        <form method="get" className="mb-4 grid gap-2 md:grid-cols-3">
          <select
            name="code"
            defaultValue={filters.code ?? ""}
            className="rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm font-medium text-[#3f4a5b]"
          >
            <option value="">All Investors</option>
            {data.investors.map((investor) => (
              <option key={investor.id} value={investor.code}>
                {investor.code.toUpperCase()}
              </option>
            ))}
          </select>
          <input
            name="symbol"
            placeholder="Symbol"
            defaultValue={filters.symbol ?? ""}
            className="rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm font-medium uppercase text-[#3f4a5b]"
          />
          <button type="submit" className="helix-btn rounded-md px-3 py-2 text-sm font-semibold">
            Apply Filters
          </button>
        </form>

        {data.queue.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <ul className="space-y-2">
            {data.queue.map((item) => (
              <li
                key={item.id}
                className={`rounded-lg border px-3 py-2 ${
                  data.selectedId === item.id
                    ? "border-[#aeb4bf] bg-white/90"
                    : "border-[var(--helix-border)] bg-white/65"
                }`}
              >
                <Link
                  href={`/patricians/approvals?selected=${item.id}${filters.code ? `&code=${filters.code}` : ""}${filters.symbol ? `&symbol=${filters.symbol}` : ""}`}
                  className="block"
                >
                  <p className="text-sm font-semibold text-[#2f394a]">
                    {item.investorCode.toUpperCase()} {item.action.toUpperCase()} {item.symbol}
                  </p>
                  <p className="text-xs text-[#556172]">
                    Target {item.targetPct.toFixed(2)}% | Confidence {item.confidence}
                  </p>
                  <p className="text-xs text-[#687486]">{new Date(item.createdAt).toLocaleString()}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="helix-panel rounded-2xl p-4">
        <h2 className="mb-3 text-2xl">Request Detail</h2>
        {!data.selectedDetail ? (
          <p className="text-sm text-[#667183]">Select a request to review.</p>
        ) : (
          <div className="space-y-3 text-sm text-[#4a5568]">
            <p>
              <strong>Investor:</strong> {String(data.selectedDetail.investorCode).toUpperCase()}
            </p>
            <p>
              <strong>Status:</strong> {String(data.selectedDetail.investorStatus)}
            </p>
            <p>
              <strong>Action:</strong> {String(data.selectedDetail.action).toUpperCase()}{" "}
              {String(data.selectedDetail.symbol)}
            </p>
            <p>
              <strong>Target:</strong> {Number(data.selectedDetail.target_pct).toFixed(2)}%
            </p>
            <p>
              <strong>Thesis:</strong> {String(data.selectedDetail.thesis || "n/a")}
            </p>
            <p>
              <strong>Risk Note:</strong> {String(data.selectedDetail.risk_note || "n/a")}
            </p>
            <p>
              <strong>Exit Plan:</strong> {String(data.selectedDetail.exit_plan || "n/a")}
            </p>
            <p>
              <strong>Current Symbol Exposure:</strong>{" "}
              {Number(data.selectedDetail.symbolExposurePct).toFixed(2)}%
            </p>

            {data.warnings.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/80 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Risk Warnings</p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-800">
                  {data.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-md border border-emerald-200 bg-emerald-50/80 p-2 text-xs text-emerald-800">
                No risk warnings for current hard rules.
              </p>
            )}

            <div className="space-y-2 border-t border-[var(--helix-border)] pt-3">
              <form action={submitApprovalAction} className="space-y-2">
                <input type="hidden" name="request_id" value={String(data.selectedDetail.id)} />
                <input type="hidden" name="decision" value="approved" />
                <textarea
                  name="notes"
                  placeholder="Notes (optional)"
                  className="h-20 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-2 py-1 text-sm"
                />
                <button type="submit" className="w-full rounded-md border border-emerald-300 bg-emerald-100/80 px-3 py-2 font-semibold text-emerald-900">
                  Approve
                </button>
              </form>

              <form action={submitApprovalAction} className="space-y-2">
                <input type="hidden" name="request_id" value={String(data.selectedDetail.id)} />
                <input type="hidden" name="decision" value="approved_edited" />
                <input
                  name="edited_target_pct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Edited target %"
                  className="w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-2 py-1 text-sm"
                />
                <textarea
                  name="notes"
                  placeholder="Reason for edit"
                  className="h-20 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-2 py-1 text-sm"
                />
                <button type="submit" className="helix-btn w-full rounded-md px-3 py-2 font-semibold">
                  Approve with Edited Size
                </button>
              </form>

              <form action={submitApprovalAction} className="space-y-2">
                <input type="hidden" name="request_id" value={String(data.selectedDetail.id)} />
                <input type="hidden" name="decision" value="rejected" />
                <textarea
                  name="notes"
                  placeholder="Rejection reason"
                  className="h-20 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-2 py-1 text-sm"
                  required
                />
                <button type="submit" className="w-full rounded-md border border-rose-300 bg-rose-100/80 px-3 py-2 font-semibold text-rose-900">
                  Reject
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
