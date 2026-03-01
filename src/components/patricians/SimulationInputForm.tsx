"use client";

import { useActionState } from "react";

import {
  saveSimulationSnapshotAction,
  type SimulationInputState,
} from "@/app/patricians/simulation/actions";

const INITIAL_STATE: SimulationInputState = {
  ok: true,
  message: "Enter sleeve values and save a simulation snapshot.",
};

export function SimulationInputForm({
  defaultDate,
  defaultAlpha,
  defaultBeta,
  defaultGamma,
}: {
  defaultDate: string;
  defaultAlpha: number;
  defaultBeta: number;
  defaultGamma: number;
}) {
  const [state, formAction, pending] = useActionState<SimulationInputState, FormData>(
    saveSimulationSnapshotAction,
    INITIAL_STATE,
  );

  return (
    <section className="helix-panel rounded-2xl p-4">
      <h2 className="mb-2 text-2xl">Manual Snapshot Entry</h2>
      <p className="mb-3 text-sm text-[#5f6b7d]">
        For now, a member can manually record simulated sleeve values after reviewing daily engine
        recommendations.
      </p>

      <form action={formAction} className="space-y-3">
        <label className="block text-sm font-semibold text-[#495467]">
          As Of Date
          <input
            name="as_of_date"
            type="date"
            defaultValue={defaultDate}
            required
            className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-semibold text-[#495467]">
            Alpha Value
            <input
              name="alpha_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultAlpha.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-[#495467]">
            Beta Value
            <input
              name="beta_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultBeta.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-[#495467]">
            Gamma Value
            <input
              name="gamma_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaultGamma.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-[#495467]">
          Notes (optional)
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            placeholder="e.g. Manual entry after reviewing alpha/beta/gamma daily recommendations."
          />
        </label>

        <button type="submit" className="helix-btn rounded-md px-4 py-2 text-sm font-semibold" disabled={pending}>
          {pending ? "Saving..." : "Save Snapshot"}
        </button>
      </form>

      <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
    </section>
  );
}

