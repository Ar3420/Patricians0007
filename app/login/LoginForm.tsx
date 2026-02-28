"use client";

import { useActionState } from "react";

import type { LoginState } from "@/app/login/actions";
import { loginAction } from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="helix-panel space-y-4 rounded-2xl p-6">
      <h1 className="helix-display text-2xl font-semibold helix-title">SER Login</h1>
      <p className="text-sm text-[#556071]">Patricians access uses numeric member credentials.</p>

      <div>
        <label htmlFor="member_id" className="mb-1 block text-sm font-medium text-[#495467]">
          Member ID (4 digits)
        </label>
        <input
          id="member_id"
          name="member_id"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          required
          className="w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm outline-none ring-0 focus:border-[#aeb4bf]"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-[#495467]">
          Password (numeric)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          inputMode="numeric"
          pattern="\d+"
          required
          className="w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm outline-none ring-0 focus:border-[#aeb4bf]"
        />
      </div>

      {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="helix-btn w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
