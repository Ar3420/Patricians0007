import { NextResponse } from "next/server";

import { requireAuth } from "@/src/lib/auth/requireAuth";
import { getDashboardData } from "@/src/lib/data/patricians";

export async function GET() {
  await requireAuth();
  const data = await getDashboardData();
  return NextResponse.json({ ok: true, data });
}
