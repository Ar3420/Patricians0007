"use client";

import { useActionState } from "react";

import { runEngineControlAction } from "@/app/patricians/engine-actions";
import type { EngineControlState } from "@/src/lib/engine/types";

const INITIAL_ENGINE_STATE: EngineControlState = {
  ok: true,
  message: "Ready.",
  output: "",
  predictions: [],
  mode: "queue",
  jobs: [],
};

export function EngineControlPanel({
  defaultRunDate,
  canRun,
  mode,
}: {
  defaultRunDate: string;
  canRun: boolean;
  mode: "queue" | "local";
}) {
  const [state, formAction, pending] = useActionState<EngineControlState, FormData>(
    runEngineControlAction,
    INITIAL_ENGINE_STATE,
  );

  return (
    <section className="helix-panel rounded-2xl p-4">
      <h2 className="text-2xl">Engine Control</h2>
      <p className="mt-1 text-sm text-[#5b6779]">
        Run Alpha/Beta/Gamma pipeline from UI: ingest market data, propose predictions, train models,
        and execute approved requests.
      </p>
      <p className="mt-1 text-xs text-[#6a7486]">
        Mode: <strong>{mode.toUpperCase()}</strong>{" "}
        {mode === "queue"
          ? "(jobs queued for local worker devices)"
          : "(runs directly on this server runtime)"}
      </p>

      <form action={formAction} className="mt-3 space-y-3">
        <label className="block text-sm font-semibold text-[#465264]">
          Run Date
          <input
            type="date"
            name="run_date"
            defaultValue={defaultRunDate}
            className="mt-1 w-full rounded-md border border-[var(--helix-border)] bg-white/85 px-3 py-2 text-sm"
            required
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="submit"
            name="stage"
            value="full_cycle"
            disabled={pending || !canRun}
            className="helix-btn rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Run Full Cycle
          </button>
          <button
            type="submit"
            name="stage"
            value="ingest"
            disabled={pending || !canRun}
            className="helix-btn rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Ingest Data
          </button>
          <button
            type="submit"
            name="stage"
            value="propose"
            disabled={pending || !canRun}
            className="helix-btn rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Propose Predictions
          </button>
          <button
            type="submit"
            name="stage"
            value="train"
            disabled={pending || !canRun}
            className="helix-btn rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Train Models
          </button>
          <button
            type="submit"
            name="stage"
            value="execute"
            disabled={pending || !canRun}
            className="helix-btn rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Execute Approved
          </button>
        </div>
      </form>

      {!canRun ? (
        <p className="mt-2 text-xs text-amber-700">
          Engine controls are disabled in local mode. Set `ENGINE_CONTROL_ENABLED=true` and configure engine path.
        </p>
      ) : null}

      <div className="mt-3 rounded-md border border-[var(--helix-border)] bg-white/60 p-3 text-sm">
        <p className={state.ok ? "text-emerald-700" : "text-rose-700"}>
          {pending ? "Running agent pipeline..." : state.message}
        </p>
        {state.predictions.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-[#4e5a6c]">
            {state.predictions.map((line) => (
              <li key={line}>- {line}</li>
            ))}
          </ul>
        ) : null}
        {state.jobs.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs text-[#4e5a6c]">
            {state.jobs.map((job) => (
              <li key={job}>* {job}</li>
            ))}
          </ul>
        ) : null}
        {state.output ? (
          <pre className="mt-2 max-h-56 overflow-auto rounded border border-[var(--helix-border)] bg-[#f2f3f5] p-2 text-[11px] text-[#3f4a5b]">
            {state.output}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
