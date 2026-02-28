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
    .select("id,state,target_pct")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.state !== "pending") {
    throw new Error("Request is no longer pending.");
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
  if (approvalError) {
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

  revalidatePath("/patricians");
  revalidatePath("/patricians/approvals");
  revalidatePath("/patricians/ledger");
}
