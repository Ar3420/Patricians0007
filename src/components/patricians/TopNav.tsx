import Link from "next/link";

import type { MemberRole } from "@/src/lib/domain/types";

export function TopNav({
  memberId,
  role,
  accountValue,
}: {
  memberId: string;
  role: MemberRole;
  accountValue: number;
}) {
  const canApprove = role === "approver" || role === "admin";
  const serCode = `SER-${memberId.slice(-2)}`;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--helix-border)] bg-[#eeeff1]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <div>
            <p className="helix-display text-xs font-semibold uppercase tracking-[0.24em] helix-accent">Helix</p>
            <p className="helix-display text-xl font-semibold helix-title">Patricians</p>
          </div>
          <nav className="flex gap-4 text-sm text-[#4b5565]">
            <Link href="/patricians" className="hover:text-[#1f2937]">
              Dashboard
            </Link>
            <Link href="/" className="hover:text-[#1f2937]">
              About
            </Link>
            <Link href="/patricians/ledger" className="hover:text-[#1f2937]">
              Ledger
            </Link>
            <Link href="/patricians/simulation" className="hover:text-[#1f2937]">
              Simulation
            </Link>
            {canApprove ? (
              <Link href="/patricians/approvals" className="hover:text-[#1f2937]">
                Approvals
              </Link>
            ) : null}
            {canApprove ? (
              <Link href="/patricians/rules" className="hover:text-[#1f2937]">
                Settings
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-md border border-[var(--helix-border)] bg-white/55 px-2 py-1 text-[#4b5565]">
            {serCode}
          </span>
          <span className="rounded-md border border-[var(--helix-border)] bg-white/70 px-2 py-1 text-[#4b5565]">
            {role.toUpperCase()}
          </span>
          <form action="/logout" method="post">
            <button type="submit" className="cursor-pointer text-[#4b5565] hover:text-[#1f2937]">
              Logout
            </button>
          </form>
          <div className="rounded-md border border-[var(--helix-border)] bg-white/90 px-3 py-1 font-medium text-[#293041]">
            ${accountValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </header>
  );
}
