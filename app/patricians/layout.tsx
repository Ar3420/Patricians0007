import { TopNav } from "@/src/components/patricians/TopNav";
import { requireAuth } from "@/src/lib/auth/requireAuth";
import { getHeaderAccountValue } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

export default async function PatriciansLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireAuth();
  const accountValue = await getHeaderAccountValue();

  return (
    <div className="min-h-screen">
      <TopNav memberId={session.memberId} role={session.role} accountValue={accountValue} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
