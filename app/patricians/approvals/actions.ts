"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/src/lib/auth/requireAuth";
import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";

const approvalSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "approved_edited", "rejected"]),
  editedTargetPct: z
    .union([z.string().trim().length(0), z.string().trim().regex(/^\d+(\.\d+)?$/)])
    .optional(),
  notes: z.string().optional(),
});

export async function submitApprovalAction(formData: FormData) {
  const session = await requireRole(["approver", "admin"]);

  const parsed = approvalSchema.safeParse({
    requestId: formData.get("request_id"),
    decision: formData.get("decision"),
    editedTargetPct: formData.get("edited_target_pct"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    throw new Error("Invalid approval payload.");
  }

  const requestId = parsed.data.requestId;
  const decision = parsed.data.decision;
  const editedTargetPct =
    parsed.data.editedTargetPct && parsed.data.editedTargetPct.length > 0
      ? Number(parsed.data.editedTargetPct)
      : null;

  const supabase = getSupabaseAdmin();
  const { data: request } = await supabase
    .from("requests")
    .select("id,state,target_pct,run_date")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    revalidatePath("/patricians");
    revalidatePath("/patricians/approvals");
    return;
  }
  if (request.state !== "pending") {
    // Idempotent: request was already processed in another submission/tab.
    revalidatePath("/patricians");
    revalidatePath("/patricians/approvals");
    revalidatePath("/patricians/ledger");
    revalidatePath("/patricians/simulation");
    return;
  }
  if (decision === "approved_edited" && (editedTargetPct === null || editedTargetPct < 0)) {
    throw new Error("Edited target percent is required for edited approval.");
  }

  const approvalPayload = {
    request_id: requestId,
    approved_by_member_id: session.memberId,
    decision,
    edited_target_pct: decision === "approved_edited" ? editedTargetPct : null,
    notes: (parsed.data.notes ?? "").trim() || null,
  };
  const { error: approvalError } = await supabase.from("approvals").insert(approvalPayload);
  const isDuplicateApproval =
    approvalError?.code === "23505" ||
    approvalError?.message.toLowerCase().includes("duplicate key");
  if (approvalError && !isDuplicateApproval) {
    throw new Error(approvalError.message);
  }

  const requestUpdate: Record<string, unknown> = {
    state: decision === "rejected" ? "rejected" : "approved",
  };
  if (decision === "approved_edited" && editedTargetPct !== null) {
    requestUpdate.target_pct = editedTargetPct;
  }
  const { error: requestError } = await supabase
    .from("requests")
    .update(requestUpdate)
    .eq("id", requestId)
    .eq("state", "pending");
  if (requestError) {
    throw new Error(requestError.message);
  }

  if (decision !== "rejected") {
    const runDate = String(request.run_date ?? "");
    const { data: existingJobs, error: existingJobsError } = await supabase
      .from("engine_jobs")
      .select("id")
      .eq("stage", "execute")
      .eq("run_date", runDate)
      .in("status", ["pending", "running"])
      .limit(1);

    try {
      if (existingJobsError) {
        throw new Error(existingJobsError.message);
      }

      if ((existingJobs ?? []).length === 0) {
        const { error: enqueueError } = await supabase.from("engine_jobs").insert({
          requested_by_member_id: session.memberId,
          target_member_id: session.memberId,
          stage: "execute",
          run_date: runDate,
          status: "pending",
          meta: {
            source: "approval-auto-execute",
            request_id: requestId,
          },
        });
        if (enqueueError) {
          throw new Error(enqueueError.message);
        }
      }
    } catch (queueError) {
      // Keep approval UX stable even if queue schema/migration differs in this environment.
      console.error("Auto-queue execute job failed:", queueError);
    }
  }

  revalidatePath("/patricians");
  revalidatePath("/patricians/approvals");
  revalidatePath("/patricians/ledger");
  revalidatePath("/patricians/simulation");
}
