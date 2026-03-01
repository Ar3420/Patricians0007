"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseAdmin } from "@/src/lib/db/supabaseAdmin";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/src/lib/auth/session";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const memberId = String(formData.get("member_id") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!/^\d{4}$/.test(memberId)) {
    return { error: "Member ID must be exactly 4 digits." };
  }
  if (!/^\d+$/.test(password) || password.length < 4) {
    return { error: "Password must be numeric." };
  }

  const supabase = getSupabaseAdmin();
  const { data: member } = await supabase
    .from("ser_members")
    .select("member_id,role,password_hash")
    .eq("member_id", memberId)
    .maybeSingle();

  if (!member) {
    return { error: "Invalid credentials." };
  }

  let isValid = false;
  try {
    isValid = await bcrypt.compare(password, String(member.password_hash));
  } catch {
    isValid = false;
  }
  if (!isValid) {
    return { error: "Invalid credentials." };
  }

  const token = await signSessionToken({
    memberId: String(member.member_id).trim(),
    role:
      String(member.member_id).trim() === "0000"
        ? "admin"
        : (member.role as "viewer" | "approver" | "admin"),
  });
  const cookieStore = await cookies();
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const isHttps = forwardedProto === "https";
  const maxAgeSeconds = 60 * 60 * 24 * 7;
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
    expires: new Date(Date.now() + maxAgeSeconds * 1000),
  });

  redirect("/patricians");
}
