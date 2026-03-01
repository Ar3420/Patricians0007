"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuth } from "@/src/lib/auth/requireAuth";
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
