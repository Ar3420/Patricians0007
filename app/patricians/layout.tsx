import { TopNav } from "@/src/components/patricians/TopNav";
import { LoginForm } from "@/app/login/LoginForm";
import { getOptionalSession } from "@/src/lib/auth/requireAuth";
import { getHeaderAccountValue } from "@/src/lib/data/patricians";

export const dynamic = "force-dynamic";

export default async function PatriciansLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalSession();

  if (!session) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-[var(--helix-border)] bg-[#eeeff1]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
            <div>
              <p className="helix-display text-xs font-semibold uppercase tracking-[0.24em] helix-accent">Helix</p>
              <p className="helix-display text-xl font-semibold helix-title">Patricians</p>
            </div>
            <span className="rounded-md border border-[var(--helix-border)] bg-white/70 px-3 py-1 text-sm text-[#4b5565]">
              Locked
            </span>
          </div>
        </header>
        <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center px-4 py-10">
          <div className="w-full max-w-md space-y-4">
            <div className="helix-panel rounded-2xl p-5 text-center">
              <h1 className="text-3xl">Session Required</h1>
              <p className="mt-2 text-sm text-[#5a6678]">
                Sign in below to unlock dashboard, investors, approvals, and ledger.
              </p>
            </div>
            <LoginForm />
          </div>
        </main>
      </div>
    );
  }

  const accountValue = await getHeaderAccountValue();

  return (
    <div className="min-h-screen">
      <TopNav memberId={session.memberId} role={session.role} accountValue={accountValue} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
