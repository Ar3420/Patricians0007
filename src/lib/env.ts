import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(16),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment. Missing/invalid: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getEnvPresence() {
  return {
    SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
  };
}
