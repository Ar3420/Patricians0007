"use client";

import { useActionState } from "react";

import { startWorkerFromSettingsAction } from "@/app/patricians/rules/actions";
import type { WorkerStartState } from "@/src/lib/engine/types";

const INITIAL_WORKER_STATE: WorkerStartState = {
  ok: true,
  message: "Worker is idle. Use Initiate Worker to start background processing on this machine.",
};

export function WorkerStartPanel() {
  const [state, formAction, pending] = useActionState<WorkerStartState, FormData>(
    startWorkerFromSettingsAction,
    INITIAL_WORKER_STATE,
  );

  return (
    <section className="mt-6 rounded-xl border border-[var(--helix-border)] bg-white/70 p-4">
      <h2 className="text-xl">Engine Worker</h2>
      <p className="mt-1 text-sm text-[#566173]">
        Starts the local Patricians worker in the background (`python -m src.ops.run_worker`).
      </p>
      <form action={formAction} className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="helix-btn rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Starting..." : "Initiate Worker"}
        </button>
      </form>
      <p className={`mt-3 text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p>
      <p className="mt-1 text-xs text-[#6b7584]">
        Note: this only works for local/self-hosted runtime and requires `WORKER_AUTOSTART_ENABLED=true`.
      </p>
    </section>
  );
}
