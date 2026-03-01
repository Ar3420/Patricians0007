"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/src/lib/auth/requireAuth";
import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";
import {
  engineControlAvailability,
  engineControlMode,
  type EngineStage,
  runEngine,
} from "@/src/lib/engine/runner";
import type { EngineControlState } from "@/src/lib/engine/types";

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function coerceStage(value: string): EngineStage {
  if (value === "ingest") return "ingest";
  if (value === "propose") return "propose";
  if (value === "execute") return "execute";
  if (value === "train") return "train";
  return "full_cycle";
}

async function predictionPreview(runDate: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const [requestsRes, investorsRes] = await Promise.all([
    supabase
      .from("requests")
      .select("investor_id,symbol,action,target_pct,confidence,state,created_at")
      .eq("run_date", runDate)
      .in("state", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("investors").select("id,code"),
  ]);

  const codeById = new Map<string, string>();
  for (const investor of investorsRes.data ?? []) {
    codeById.set(String(investor.id), String(investor.code).toUpperCase());
  }

  return (requestsRes.data ?? []).map((row) => {
    const code = codeById.get(String(row.investor_id)) ?? "N/A";
    const action = String(row.action).toUpperCase();
    const symbol = String(row.symbol);
    const pct = Number(row.target_pct ?? 0).toFixed(2);
    const conf = Number(row.confidence ?? 0);
    const state = String(row.state).toUpperCase();
    return `${code} ${action} ${symbol} ${pct}% (conf ${conf}, ${state})`;
  });
}

async function latestJobs(memberId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("engine_jobs")
    .select("id,stage,status,run_date,requested_at,claimed_by_device,error_text")
    .eq("requested_by_member_id", memberId)
    .order("requested_at", { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => {
    const stage = String(row.stage).toUpperCase();
    const status = String(row.status).toUpperCase();
    const date = String(row.run_date);
    const device = row.claimed_by_device ? ` on ${String(row.claimed_by_device)}` : "";
    const err = row.error_text ? ` | ${String(row.error_text).slice(0, 120)}` : "";
    return `${date} ${stage} -> ${status}${device}${err}`;
  });
}

export async function runEngineControlAction(
  _prev: EngineControlState,
  formData: FormData,
): Promise<EngineControlState> {
  const session = await requireRole(["approver", "admin"]);

  const stage = coerceStage(String(formData.get("stage") ?? "full_cycle"));
  const runDate = String(formData.get("run_date") ?? "").trim();
  const mode = engineControlMode();
  if (!validDate(runDate)) {
    return {
      ok: false,
      message: "Run date must be YYYY-MM-DD.",
      output: "",
      predictions: [],
      mode,
      jobs: [],
    };
  }

  if (mode === "queue") {
    const supabase = getSupabaseAdmin();
    const payload = {
      requested_by_member_id: session.memberId,
      target_member_id: session.memberId,
      stage,
      run_date: runDate,
      status: "pending",
      meta: {
        source: "web-ui",
      },
    };
    const { error } = await supabase.from("engine_jobs").insert(payload);
    if (error) {
      return {
        ok: false,
        message: `Queue insert failed: ${error.message}`,
        output: "",
        predictions: [],
        mode,
        jobs: await latestJobs(session.memberId),
      };
    }
    revalidatePath("/patricians");

    return {
      ok: true,
      message: `Job queued: ${stage} for ${runDate}. A local worker signed in as SER-${session.memberId.slice(-2)} can execute it.`,
      output: "",
      predictions: [],
      mode,
      jobs: await latestJobs(session.memberId),
    };
  }

  const availability = engineControlAvailability();
  if (!availability.enabled) {
    return {
      ok: false,
      message: availability.reason ?? "Engine controls unavailable.",
      output: `Engine path: ${availability.path}`,
      predictions: [],
      mode,
      jobs: await latestJobs(session.memberId),
    };
  }

  const result = await runEngine(stage, runDate);
  const predictions =
    result.ok && (stage === "propose" || stage === "full_cycle")
      ? await predictionPreview(runDate)
      : [];

  revalidatePath("/patricians");
  revalidatePath("/patricians/approvals");

  return {
    ok: result.ok,
    message: result.ok
      ? `Stage ${stage} completed in ${(result.durationMs / 1000).toFixed(1)}s.`
      : `Stage ${stage} failed: ${result.error ?? "unknown error"}`,
    output: result.output,
    predictions,
    mode,
    jobs: await latestJobs(session.memberId),
  };
}
