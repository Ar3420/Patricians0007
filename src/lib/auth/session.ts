import { decodeJwt, SignJWT, jwtVerify } from "jose";

import type { MemberRole, SessionUser } from "@/src/lib/domain/types";

export const SESSION_COOKIE_NAME = "ser_session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be configured and at least 16 chars.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    member_id: user.memberId,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const result = await jwtVerify(token, getJwtSecret());
    const memberId = result.payload.member_id;
    const role = result.payload.role;

    if (
      typeof memberId !== "string" ||
      !/^\d{4}$/.test(memberId) ||
      (role !== "viewer" && role !== "approver" && role !== "admin")
    ) {
      return null;
    }
    return { memberId, role: role as MemberRole };
  } catch {
    return null;
  }
}

export function decodeSessionTokenUnsafe(token: string): SessionUser | null {
  try {
    const payload = decodeJwt(token);
    const memberId = payload.member_id;
    const role = payload.role;
    if (
      typeof memberId !== "string" ||
      !/^\d{4}$/.test(memberId) ||
      (role !== "viewer" && role !== "approver" && role !== "admin")
    ) {
      return null;
    }
    return { memberId, role: role as MemberRole };
  } catch {
    return null;
  }
}
