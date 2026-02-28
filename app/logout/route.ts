import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/src/lib/auth/session";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.redirect(new URL("/login", request.url));
}
