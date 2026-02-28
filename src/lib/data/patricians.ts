import "server-only";

import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";
import { evaluateRiskWarnings, RISK_RULES } from "@/src/lib/domain/risk";
import type { InvestorCode } from "@/src/lib/domain/types";

function asNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function formatInvestorCode(code: string): InvestorCode {
  return (["alpha", "beta", "gamma"].includes(code) ? code : "alpha") as InvestorCode;
}

async function getLatestCloseMap(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) {
    return {};
  }
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("market_candles_daily")
    .select("symbol,date,close")
    .in("symbol", symbols)
    .order("date", { ascending: false })
    .limit(Math.max(100, symbols.length * 30));

  const closeMap: Record<string, number> = {};
  for (const row of data ?? []) {
    const symbol = asText(row.symbol);
    if (!symbol || closeMap[symbol] !== undefined) {
      continue;
    }
    closeMap[symbol] = asNumber(row.close, 0);
  }
  return closeMap;
}

export async function getHeaderAccountValue(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("portfolio_snapshots")
    .select("total_value")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  return asNumber(data?.total_value, 0);
}

export async function getDashboardData() {
  const supabase = getSupabaseAdmin();

  const [
    investorsRes,
    latestSnapshotsRes,
    firstSnapshotRes,
    positionsRes,
    pendingRequestsRes,
    recentRequestsRes,
    recentTradesRes,
    engineRunsRes,
  ] = await Promise.all([
    supabase.from("investors").select("*").order("code", { ascending: true }),
    supabase
      .from("portfolio_snapshots")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(2),
    supabase
      .from("portfolio_snapshots")
      .select("total_value")
      .order("timestamp", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("positions").select("*"),
    supabase
      .from("requests")
      .select("id,investor_id,symbol,action,target_pct,created_at,state")
      .eq("state", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("requests")
      .select("id,investor_id,symbol,action,target_pct,state,created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("trades")
      .select("id,investor_id,symbol,side,qty,price,executed_at")
      .order("executed_at", { ascending: false })
      .limit(12),
    supabase
      .from("engine_runs")
      .select("stage,created_at,status,run_date")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const investors = investorsRes.data ?? [];
  const investorById = new Map<string, { code: string; status: string; riskBudgetPct: number; name: string }>();
  for (const investor of investors) {
    investorById.set(String(investor.id), {
      code: asText(investor.code),
      status: asText(investor.status),
      riskBudgetPct: asNumber(investor.risk_budget_pct),
      name: asText(investor.name),
    });
  }

  const positions = positionsRes.data ?? [];
  const symbols = Array.from(new Set(positions.map((p) => asText(p.symbol)).filter(Boolean)));
  const latestCloseMap = await getLatestCloseMap(symbols);

  const latestSnapshot = latestSnapshotsRes.data?.[0];
  const previousSnapshot = latestSnapshotsRes.data?.[1];
  const totalValue = asNumber(latestSnapshot?.total_value, 0);
  const cashValue = asNumber(latestSnapshot?.cash_value, 0);
  const drawdown = asNumber(latestSnapshot?.drawdown, 0);
  const todayPL = totalValue - asNumber(previousSnapshot?.total_value, totalValue);
  const allTimePL = totalValue - asNumber(firstSnapshotRes.data?.total_value, totalValue);

  const positionValueByInvestor = new Map<string, number>();
  const positionCountByInvestor = new Map<string, number>();
  const exposureBySymbol = new Map<string, number>();
  for (const position of positions) {
    const investorId = asText(position.investor_id);
    const symbol = asText(position.symbol);
    const qty = asNumber(position.qty);
    const avgPrice = asNumber(position.avg_price);
    const px = latestCloseMap[symbol] ?? avgPrice;
    const value = Math.max(qty, 0) * Math.max(px, 0);

    positionValueByInvestor.set(investorId, (positionValueByInvestor.get(investorId) ?? 0) + value);
    positionCountByInvestor.set(investorId, (positionCountByInvestor.get(investorId) ?? 0) + 1);
    exposureBySymbol.set(symbol, (exposureBySymbol.get(symbol) ?? 0) + value);
  }

  const pendingByInvestor = new Map<string, number>();
  for (const request of pendingRequestsRes.data ?? []) {
    const investorId = asText(request.investor_id);
    pendingByInvestor.set(investorId, (pendingByInvestor.get(investorId) ?? 0) + 1);
  }

  const investorCards = investors.map((investor) => {
    const id = asText(investor.id);
    const sleevePct = asNumber(investor.risk_budget_pct, 0);
    return {
      id,
      code: asText(investor.code),
      name: asText(investor.name),
      status: asText(investor.status),
      riskBudgetPct: sleevePct,
      sleeveValue: (totalValue * sleevePct) / 100,
      openPositionsCount: positionCountByInvestor.get(id) ?? 0,
      pendingRequestsCount: pendingByInvestor.get(id) ?? 0,
    };
  });

  const pendingQueue = (pendingRequestsRes.data ?? []).map((request) => {
    const investor = investorById.get(asText(request.investor_id));
    return {
      id: asText(request.id),
      createdAt: asText(request.created_at),
      symbol: asText(request.symbol),
      action: asText(request.action),
      targetPct: asNumber(request.target_pct),
      state: asText(request.state),
      investorCode: investor?.code ?? "unknown",
    };
  });

  const recentRequests = (recentRequestsRes.data ?? []).map((request) => {
    const investor = investorById.get(asText(request.investor_id));
    return {
      id: asText(request.id),
      time: asText(request.created_at),
      text: `${investor?.code?.toUpperCase() ?? "N/A"} ${asText(request.action).toUpperCase()} ${asText(request.symbol)} @ ${asNumber(request.target_pct).toFixed(2)}%`,
      type: "request" as const,
    };
  });

  const recentTrades = (recentTradesRes.data ?? []).map((trade) => {
    const investor = investorById.get(asText(trade.investor_id));
    return {
      id: asText(trade.id),
      time: asText(trade.executed_at),
      text: `${investor?.code?.toUpperCase() ?? "N/A"} ${asText(trade.side).toUpperCase()} ${asText(trade.symbol)} ${asNumber(trade.qty).toFixed(2)} @ ${asNumber(trade.price).toFixed(2)}`,
      type: "trade" as const,
    };
  });

  const recentActivity = [...recentRequests, ...recentTrades]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice(0, 16);

  const exposureSummary = Array.from(exposureBySymbol.entries())
    .map(([symbol, value]) => ({
      symbol,
      value,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const nextRunHints = {
    propose: "After market close (daily)",
    execute: "Next market open (daily)",
    train: "Weekly optimization (weekly mode)",
    latestEngineRuns: (engineRunsRes.data ?? []).map((run) => ({
      stage: asText(run.stage),
      status: asText(run.status),
      runDate: asText(run.run_date),
      createdAt: asText(run.created_at),
    })),
  };

  return {
    totals: {
      totalValue,
      cashValue,
      cashPct: totalValue > 0 ? (cashValue / totalValue) * 100 : 0,
      todayPL,
      allTimePL,
      drawdown,
    },
    investorCards,
    exposureSummary,
    pendingQueue,
    recentActivity,
    nextRunHints,
  };
}

export async function getInvestorDetail(code: string) {
  const normalizedCode = formatInvestorCode(code);
  const supabase = getSupabaseAdmin();
  const { data: investor } = await supabase
    .from("investors")
    .select("*")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (!investor) {
    return null;
  }

  const [positionsRes, requestsRes, snapshotsRes] = await Promise.all([
    supabase.from("positions").select("*").eq("investor_id", investor.id).order("updated_at", { ascending: false }),
    supabase
      .from("requests")
      .select("*")
      .eq("investor_id", investor.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("portfolio_snapshots")
      .select("timestamp,total_value,drawdown,cash_value")
      .order("timestamp", { ascending: false })
      .limit(30),
  ]);

  const positions = positionsRes.data ?? [];
  const symbols = Array.from(new Set(positions.map((p) => asText(p.symbol)).filter(Boolean)));
  const closeMap = await getLatestCloseMap(symbols);
  const positionRows = positions.map((position) => {
    const symbol = asText(position.symbol);
    const qty = asNumber(position.qty);
    const avgPrice = asNumber(position.avg_price);
    const mark = closeMap[symbol] ?? avgPrice;
    return {
      id: asText(position.id),
      symbol,
      qty,
      avgPrice,
      markPrice: mark,
      value: qty * mark,
      updatedAt: asText(position.updated_at),
    };
  });

  const snapshots = snapshotsRes.data ?? [];
  const latest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];

  return {
    investor: {
      id: asText(investor.id),
      code: asText(investor.code),
      name: asText(investor.name),
      status: asText(investor.status),
      riskBudgetPct: asNumber(investor.risk_budget_pct),
    },
    positions: positionRows,
    requests: requestsRes.data ?? [],
    stats: {
      snapshotCount: snapshots.length,
      latestTotalValue: asNumber(latest?.total_value, 0),
      latestCashValue: asNumber(latest?.cash_value, 0),
      latestDrawdown: asNumber(latest?.drawdown, 0),
      periodChange:
        snapshots.length > 1
          ? asNumber(latest?.total_value, 0) - asNumber(oldest?.total_value, 0)
          : 0,
    },
  };
}

export async function getApprovalsData(filters: {
  code?: string;
  symbol?: string;
  selected?: string;
}) {
  const supabase = getSupabaseAdmin();
  const investorsRes = await supabase.from("investors").select("*");
  const investors = investorsRes.data ?? [];
  const investorById = new Map(investors.map((i) => [String(i.id), i]));
  const investorByCode = new Map(investors.map((i) => [String(i.code), i]));

  let pendingQuery = supabase
    .from("requests")
    .select("*")
    .eq("state", "pending")
    .order("created_at", { ascending: true });

  if (filters.code && investorByCode.has(filters.code)) {
    pendingQuery = pendingQuery.eq("investor_id", investorByCode.get(filters.code)?.id as string);
  }
  if (filters.symbol) {
    pendingQuery = pendingQuery.eq("symbol", filters.symbol.toUpperCase());
  }

  const [pendingRes, positionsRes, snapshotRes] = await Promise.all([
    pendingQuery,
    supabase.from("positions").select("*"),
    supabase
      .from("portfolio_snapshots")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const pending = pendingRes.data ?? [];
  const selectedId = filters.selected ?? pending[0]?.id;
  const selected = pending.find((row) => row.id === selectedId) ?? null;

  const positions = positionsRes.data ?? [];
  const symbols = Array.from(new Set(positions.map((p) => asText(p.symbol)).filter(Boolean)));
  const closeMap = await getLatestCloseMap(symbols);
  const totalValue = asNumber(snapshotRes.data?.total_value, 0);
  const drawdownPct = asNumber(snapshotRes.data?.drawdown, 0);

  let warnings: string[] = [];
  let selectedDetail: Record<string, unknown> | null = null;
  if (selected) {
    const investor = investorById.get(String(selected.investor_id));
    const investorCode = formatInvestorCode(asText(investor?.code));
    const investorStatus = (asText(investor?.status) as "active" | "paused" | "locked") || "active";
    const targetPct = asNumber(selected.target_pct);
    const symbol = asText(selected.symbol);

    let symbolValue = 0;
    for (const position of positions) {
      if (asText(position.symbol) !== symbol) {
        continue;
      }
      const qty = asNumber(position.qty);
      const px = closeMap[symbol] ?? asNumber(position.avg_price);
      symbolValue += qty * px;
    }
    const symbolExposurePct = totalValue > 0 ? (symbolValue / totalValue) * 100 : 0;
    warnings = evaluateRiskWarnings({
      investorCode,
      investorStatus,
      symbol,
      targetPct,
      symbolExposurePct,
      drawdownPct,
    });

    selectedDetail = {
      ...selected,
      investorCode,
      investorStatus,
      sleeveBudgetPct:
        investorCode === "alpha"
          ? RISK_RULES.SLEEVE_WEIGHTS.alpha
          : investorCode === "beta"
            ? RISK_RULES.SLEEVE_WEIGHTS.beta
            : RISK_RULES.SLEEVE_WEIGHTS.gamma,
      symbolExposurePct,
    };
  }

  return {
    investors: investors.map((investor) => ({
      id: asText(investor.id),
      code: asText(investor.code),
      name: asText(investor.name),
      status: asText(investor.status),
    })),
    queue: pending.map((request) => ({
      id: asText(request.id),
      investorId: asText(request.investor_id),
      investorCode: asText(investorById.get(asText(request.investor_id))?.code),
      symbol: asText(request.symbol),
      action: asText(request.action),
      targetPct: asNumber(request.target_pct),
      confidence: asNumber(request.confidence),
      createdAt: asText(request.created_at),
      thesis: asText(request.thesis),
      riskNote: asText(request.risk_note),
      exitPlan: asText(request.exit_plan),
    })),
    selectedId: selectedId ? String(selectedId) : null,
    selectedDetail,
    warnings,
  };
}

export async function getLedgerData() {
  const supabase = getSupabaseAdmin();
  const [investorsRes, requestsRes, approvalsRes, tradesRes] = await Promise.all([
    supabase.from("investors").select("id,code"),
    supabase
      .from("requests")
      .select("id,investor_id,created_at,state,symbol,action,target_pct")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("approvals")
      .select("id,request_id,approved_by_member_id,decision,edited_target_pct,created_at")
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("trades")
      .select("id,request_id,investor_id,symbol,side,qty,price,executed_at")
      .order("executed_at", { ascending: false })
      .limit(120),
  ]);

  const investorCodeById = new Map<string, string>();
  for (const investor of investorsRes.data ?? []) {
    investorCodeById.set(String(investor.id), asText(investor.code).toUpperCase());
  }

  const events = [
    ...(requestsRes.data ?? []).map((row) => ({
      id: `req-${row.id}`,
      time: asText(row.created_at),
      type: "request",
      detail: `${investorCodeById.get(asText(row.investor_id)) ?? "N/A"} ${asText(row.action).toUpperCase()} ${asText(row.symbol)} target ${asNumber(row.target_pct).toFixed(2)}% (${asText(row.state)})`,
    })),
    ...(approvalsRes.data ?? []).map((row) => ({
      id: `apv-${row.id}`,
      time: asText(row.created_at),
      type: "approval",
      detail: `${asText(row.decision)} by ${asText(row.approved_by_member_id)} (${asText(row.request_id)})`,
    })),
    ...(tradesRes.data ?? []).map((row) => ({
      id: `trd-${row.id}`,
      time: asText(row.executed_at),
      type: "trade",
      detail: `${investorCodeById.get(asText(row.investor_id)) ?? "N/A"} ${asText(row.side).toUpperCase()} ${asText(row.symbol)} ${asNumber(row.qty).toFixed(2)} @ ${asNumber(row.price).toFixed(2)}`,
    })),
  ]
    .sort((a, b) => (a.time < b.time ? 1 : -1))
    .slice(0, 180);

  return { events };
}

export async function getTreasuryRules() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("treasury_rules").select("*").limit(1).maybeSingle();
  return {
    profitSiphonPct: asNumber(data?.profit_siphon_pct, 0.3),
    reinvestPct: asNumber(data?.reinvest_pct, 0.7),
    updatedAt: asText(data?.updated_at),
  };
}
