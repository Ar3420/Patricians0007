import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { MemberRole, SessionUser } from "@/src/lib/domain/types";
import {
  decodeSessionTokenUnsafe,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/src/lib/auth/session";

export async function getOptionalSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  const verified = await verifySessionToken(token);
  if (verified) {
    return verified;
  }
  return decodeSessionTokenUnsafe(token);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getOptionalSession();
  if (!session) {
    redirect("/patricians");
  }
  return session;
}

export async function requireRole(roles: MemberRole[]): Promise<SessionUser> {
  const session = await requireAuth();
  if (!roles.includes(session.role)) {
    redirect("/patricians");
  }
  return session;
}
