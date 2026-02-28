import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/patricians", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login"],
};
