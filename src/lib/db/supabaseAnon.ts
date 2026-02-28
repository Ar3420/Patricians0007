import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/src/lib/env";

let anonClient: SupabaseClient | null = null;

export function getSupabaseAnon() {
  if (anonClient) {
    return anonClient;
  }
  const env = getServerEnv();
  anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  return anonClient;
}
