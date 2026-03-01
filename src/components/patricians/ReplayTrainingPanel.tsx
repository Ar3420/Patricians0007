"use client";

import { useActionState } from "react";

import {
  startReplayTrainingAction,
  type ReplayTrainingState,
} from "@/app/patricians/simulation/actions";

const INITIAL_STATE: ReplayTrainingState = {
  ok: true,
  message: "Configure replay start values/date and launch training replay.",
};

export function ReplayTrainingPanel({
  defaultStartDate,
  defaultEndDate,
  defaultAlpha,
  defaultBeta,
  defaultGamma,
  replayStatus,
}: {
  defaultStartDate: string;
  defaultEndDate: string;
  defaultAlpha: number;
  defaultBeta: number;
  defaultGamma: number;
  replayStatus: {
    status: string;
    startDate: string;
    endDate: string;
    currentDate: string;
    lastMessage: string;
    errorText: string;
    updatedAt: string;
  } | null;
}) {
  const [state, formAction, pending] = useActionState<ReplayTrainingState, FormData>(
    startReplayTrainingAction,
    INITIAL_STATE,
  );

  return (
    <section className="helix-panel rounded-2xl p-4">
      <h2 className="mb-2 text-2xl">Replay Training</h2>
      <p className="mb-3 text-sm text-[#5f6b7d]">
        Single-launch replay from a start date to an end date. Worker generates daily requests,
        pauses for approvals, then advances once approvals are resolved.
      </p>

      <form action={formAction} className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#495467]">
            Start Date
            <input
              type="date"
              name="start_date"
              defaultValue={defaultStartDate}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-[#495467]">
            End Date
            <input
              type="date"
              name="end_date"
              defaultValue={defaultEndDate}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="block text-sm font-semibold text-[#495467]">
            Start Alpha
            <input
              type="number"
              name="start_alpha_value"
              min="0"
              step="0.01"
              defaultValue={defaultAlpha.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-[#495467]">
            Start Beta
            <input
              type="number"
              name="start_beta_value"
              min="0"
              step="0.01"
              defaultValue={defaultBeta.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-[#495467]">
            Start Gamma
            <input
              type="number"
              name="start_gamma_value"
              min="0"
              step="0.01"
              defaultValue={defaultGamma.toFixed(2)}
              required
              className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[#4c586a]">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="reset_state" defaultChecked />
            Reset simulation state before replay
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="auto_weekly_train" />
            Weekly train during replay (experimental)
          </label>
        </div>

        <button type="submit" className="helix-btn rounded-md px-4 py-2 text-sm font-semibold" disabled={pending}>
          {pending ? "Starting..." : "Start Replay Training"}
        </button>
      </form>

      <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>

      {replayStatus ? (
        <div className="mt-3 rounded-lg border border-[var(--helix-border)] bg-white/70 p-3 text-sm text-[#4b5668]">
          <p>
            <strong>Status:</strong> {replayStatus.status}
          </p>
          <p>
            <strong>Range:</strong> {replayStatus.startDate} to {replayStatus.endDate}
          </p>
          <p>
            <strong>Current Date:</strong> {replayStatus.currentDate}
          </p>
          <p>
            <strong>Message:</strong> {replayStatus.lastMessage || "n/a"}
          </p>
          {replayStatus.errorText ? (
            <p className="text-rose-700">
              <strong>Error:</strong> {replayStatus.errorText}
            </p>
          ) : null}
          <p className="text-xs text-[#6a7486]">
            Updated: {replayStatus.updatedAt ? new Date(replayStatus.updatedAt).toLocaleString() : "n/a"}
          </p>
        </div>
      ) : null}
    </section>
  );
}

