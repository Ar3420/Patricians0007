import { redirect } from "next/navigation";

import { getOptionalSession } from "@/src/lib/auth/requireAuth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getOptionalSession();
  if (session) {
    redirect("/patricians");
  }
  redirect("/login");
}
