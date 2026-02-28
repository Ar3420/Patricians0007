import { NextResponse } from "next/server";

import { getEnvPresence } from "@/src/lib/env";

export async function GET() {
  const env = getEnvPresence();
  const ok = Object.values(env).every(Boolean);
  return NextResponse.json({ ok, env });
}
