"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/src/lib/auth/requireAuth";
import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";

const approvalSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "approved_edited", "rejected"]),
  editedTargetPct: z.string().optional(),
  notes: z.string().optional(),
});

export async function submitApprovalAction(formData: FormData) {
  const revalidateAll = () => {
    revalidatePath("/patricians");
    revalidatePath("/patricians/approvals");
    revalidatePath("/patricians/ledger");
    revalidatePath("/patricians/simulation");
  };
  const fail = (message: string, details?: unknown) => {
    console.error("submitApprovalAction:", message, details ?? "");
    revalidateAll();
    return;
  };

  const session = await requireRole(["approver", "admin"]);

  const rawRequestId = formData.get("request_id");
  const rawDecision = formData.get("decision");
  const rawEditedTargetPct = formData.get("edited_target_pct");
  const rawNotes = formData.get("notes");

  const parsed = approvalSchema.safeParse({
    requestId: rawRequestId == null ? undefined : String(rawRequestId),
    decision: rawDecision == null ? undefined : String(rawDecision),
    editedTargetPct: rawEditedTargetPct == null ? undefined : String(rawEditedTargetPct).trim(),
    notes: rawNotes == null ? undefined : String(rawNotes),
  });
  if (!parsed.success) {
    return fail("Invalid approval payload.", parsed.error.flatten());
  }

  const requestId = parsed.data.requestId;
  const decision = parsed.data.decision;
  const editedTargetPctRaw = parsed.data.editedTargetPct ?? "";
  const editedTargetPct = editedTargetPctRaw.length > 0 ? Number(editedTargetPctRaw) : null;

  const supabase = getSupabaseAdmin();
  const { data: request } = await supabase
    .from("requests")
    .select("id,state,target_pct,run_date")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    revalidateAll();
    return;
  }
  if (request.state !== "pending") {
    // Idempotent: request was already processed in another submission/tab.
    revalidateAll();
    return;
  }
  if (
    decision === "approved_edited" &&
    (editedTargetPct === null || !Number.isFinite(editedTargetPct) || editedTargetPct < 0 || editedTargetPct > 100)
  ) {
    return fail("Invalid edited target percent. Must be between 0 and 100.");
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
    return fail("Approval insert failed", approvalError.message);
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
    return fail("Request update failed", requestError.message);
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

  revalidateAll();
}
