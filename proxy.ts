import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/src/lib/auth/session";

const APPROVER_PATHS = ["/patricians/approvals", "/patricians/rules"];

function loginRedirect(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (pathname === "/login") {
    if (token) {
      return NextResponse.redirect(new URL("/patricians", request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/patricians")) {
    return NextResponse.next();
  }

  if (!token) {
    return loginRedirect(request);
  }

  const isApproverPath = APPROVER_PATHS.some((path) => pathname.startsWith(path));
  if (isApproverPath) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/patricians/:path*"],
};
