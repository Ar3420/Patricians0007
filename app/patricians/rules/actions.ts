"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/src/lib/auth/requireAuth";
import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";
import { startWorkerDetached } from "@/src/lib/engine/runner";
import type { WorkerStartState } from "@/src/lib/engine/types";

const rulesSchema = z.object({
  profitSiphonPct: z.number().min(0).max(1),
  reinvestPct: z.number().min(0).max(1),
});

export async function updateTreasuryRulesAction(formData: FormData) {
  await requireRole(["approver", "admin"]);

  const parsed = rulesSchema.safeParse({
    profitSiphonPct: Number(formData.get("profit_siphon_pct")),
    reinvestPct: Number(formData.get("reinvest_pct")),
  });
  if (!parsed.success) {
    throw new Error("Invalid treasury rule input.");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("treasury_rules").upsert(
    {
      id: true,
      profit_siphon_pct: parsed.data.profitSiphonPct,
      reinvest_pct: parsed.data.reinvestPct,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/patricians/rules");
  revalidatePath("/patricians");
}

export async function startWorkerFromSettingsAction(
  prev: WorkerStartState,
  formData: FormData,
): Promise<WorkerStartState> {
  void prev;
  void formData;
  await requireRole(["approver", "admin"]);
  const result = startWorkerDetached();
  revalidatePath("/patricians");
  revalidatePath("/patricians/rules");
  return result;
}
