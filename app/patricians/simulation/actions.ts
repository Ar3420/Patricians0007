"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth, requireRole } from "@/src/lib/auth/requireAuth";
import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";

const simulationInputSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  alphaValue: z.number().min(0),
  betaValue: z.number().min(0),
  gammaValue: z.number().min(0),
  notes: z.string().max(1000).optional(),
});

export interface SimulationInputState {
  ok: boolean;
  message: string;
}

const replayInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  alphaValue: z.number().min(0),
  betaValue: z.number().min(0),
  gammaValue: z.number().min(0),
  resetState: z.boolean().default(true),
  autoWeeklyTrain: z.boolean().default(false),
});

export interface ReplayTrainingState {
  ok: boolean;
  message: string;
}

export async function saveSimulationSnapshotAction(
  _prev: SimulationInputState,
  formData: FormData,
): Promise<SimulationInputState> {
  const parsed = simulationInputSchema.safeParse({
    asOfDate: String(formData.get("as_of_date") ?? "").trim(),
    alphaValue: Number(formData.get("alpha_value")),
    betaValue: Number(formData.get("beta_value")),
    gammaValue: Number(formData.get("gamma_value")),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid snapshot input. Check date and numeric values.",
    };
  }

  const session = await requireAuth();
  const totalValue = parsed.data.alphaValue + parsed.data.betaValue + parsed.data.gammaValue;
  const supabase = getSupabaseAdmin();

  const benchmarkRes = await supabase
    .from("market_candles_daily")
    .select("close,date")
    .eq("symbol", "SPY")
    .lte("date", parsed.data.asOfDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const benchmarkClose = benchmarkRes.error ? null : Number(benchmarkRes.data?.close ?? 0) || null;

  const { error } = await supabase.from("simulation_snapshots").upsert(
    {
      as_of_date: parsed.data.asOfDate,
      alpha_value: parsed.data.alphaValue,
      beta_value: parsed.data.betaValue,
      gamma_value: parsed.data.gammaValue,
      total_value: totalValue,
      benchmark_symbol: "SPY",
      benchmark_close: benchmarkClose,
      notes: parsed.data.notes ?? null,
      created_by_member_id: session.memberId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "as_of_date" },
  );

  if (error) {
    return {
      ok: false,
      message: `Failed to save snapshot: ${error.message}`,
    };
  }

  revalidatePath("/patricians/simulation");
  revalidatePath("/patricians");

  return {
    ok: true,
    message: `Saved simulation snapshot for ${parsed.data.asOfDate}.`,
  };
}

export async function startReplayTrainingAction(
  _prev: ReplayTrainingState,
  formData: FormData,
): Promise<ReplayTrainingState> {
  const session = await requireRole(["approver", "admin"]);

  const parsed = replayInputSchema.safeParse({
    startDate: String(formData.get("start_date") ?? "").trim(),
    endDate: String(formData.get("end_date") ?? "").trim(),
    alphaValue: Number(formData.get("start_alpha_value")),
    betaValue: Number(formData.get("start_beta_value")),
    gammaValue: Number(formData.get("start_gamma_value")),
    resetState:
      String(formData.get("reset_state") ?? "").trim().toLowerCase() === "on" ||
      String(formData.get("reset_state") ?? "").trim().toLowerCase() === "true",
    autoWeeklyTrain:
      String(formData.get("auto_weekly_train") ?? "").trim().toLowerCase() === "on" ||
      String(formData.get("auto_weekly_train") ?? "").trim().toLowerCase() === "true",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid replay input. Check dates and start values.",
    };
  }

  if (parsed.data.endDate < parsed.data.startDate) {
    return {
      ok: false,
      message: "End date must be on or after start date.",
    };
  }

  const supabase = getSupabaseAdmin();

  const { data: existingReplay, error: replayFetchError } = await supabase
    .from("simulation_replays")
    .select("id,status")
    .in("status", ["pending", "running", "awaiting_approvals"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (replayFetchError) {
    return {
      ok: false,
      message: `Replay setup error: ${replayFetchError.message}`,
    };
  }

  if (existingReplay) {
    return {
      ok: false,
      message: `A replay is already active (${String(existingReplay.status)}). Complete/cancel it first.`,
    };
  }

  const startTotal = parsed.data.alphaValue + parsed.data.betaValue + parsed.data.gammaValue;

  if (parsed.data.resetState) {
    const cleanupOps = [
      supabase.from("approvals").delete().not("id", "is", null),
      supabase.from("trades").delete().not("id", "is", null),
      supabase.from("requests").delete().not("id", "is", null),
      supabase.from("positions").delete().not("id", "is", null),
      supabase.from("portfolio_snapshots").delete().not("id", "is", null),
      supabase.from("simulation_snapshots").delete().not("id", "is", null),
      supabase.from("engine_runs").delete().not("id", "is", null),
      supabase.from("engine_jobs").delete().not("id", "is", null),
    ];
    const cleanupResults = await Promise.all(cleanupOps);
    const cleanupError = cleanupResults.find((res) => res.error);
    if (cleanupError?.error) {
      return {
        ok: false,
        message: `Failed to reset simulation state: ${cleanupError.error.message}`,
      };
    }
  }

  const baselineTs = `${parsed.data.startDate}T00:00:00.000Z`;
  const baselineSnapshot = await supabase.from("portfolio_snapshots").insert({
    timestamp: baselineTs,
    total_value: startTotal,
    cash_value: startTotal,
    drawdown: 0,
    benchmark_value: startTotal,
    notes: "Replay baseline",
  });
  if (baselineSnapshot.error) {
    return {
      ok: false,
      message: `Failed to seed baseline portfolio snapshot: ${baselineSnapshot.error.message}`,
    };
  }

  const simulationBaseline = await supabase.from("simulation_snapshots").upsert(
    {
      as_of_date: parsed.data.startDate,
      alpha_value: parsed.data.alphaValue,
      beta_value: parsed.data.betaValue,
      gamma_value: parsed.data.gammaValue,
      total_value: startTotal,
      benchmark_symbol: "SPY",
      benchmark_close: null,
      notes: "Replay baseline",
      created_by_member_id: session.memberId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "as_of_date" },
  );
  if (simulationBaseline.error) {
    return {
      ok: false,
      message: `Failed to seed baseline simulation snapshot: ${simulationBaseline.error.message}`,
    };
  }

  const { error: replayInsertError } = await supabase.from("simulation_replays").insert({
    requested_by_member_id: session.memberId,
    target_member_id: session.memberId,
    status: "pending",
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    current_date: parsed.data.startDate,
    start_alpha_value: parsed.data.alphaValue,
    start_beta_value: parsed.data.betaValue,
    start_gamma_value: parsed.data.gammaValue,
    start_total_value: startTotal,
    reset_state: parsed.data.resetState,
    auto_weekly_train: parsed.data.autoWeeklyTrain,
    last_message: "Queued replay run.",
    meta: {
      source: "web-ui",
    },
  });

  if (replayInsertError) {
    return {
      ok: false,
      message: `Failed to start replay: ${replayInsertError.message}`,
    };
  }

  revalidatePath("/patricians/simulation");
  revalidatePath("/patricians");
  revalidatePath("/patricians/approvals");

  return {
    ok: true,
    message: `Replay started from ${parsed.data.startDate} to ${parsed.data.endDate}. Worker will pause each day for approvals.`,
  };
}
