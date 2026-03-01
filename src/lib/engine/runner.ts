import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export type EngineStage = "ingest" | "propose" | "execute" | "train" | "full_cycle";

export interface EngineRunResult {
  ok: boolean;
  stage: EngineStage;
  durationMs: number;
  output: string;
  error?: string;
}

const RUN_TIMEOUT_MS = 15 * 60 * 1000;

function enginePath(): string {
  const configured = process.env.ENGINE_PROJECT_PATH?.trim();
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), "..", "engine");
}

export function engineControlAvailability(): { enabled: boolean; reason?: string; path: string } {
  const resolved = enginePath();
  if (!existsSync(resolved)) {
    return {
      enabled: false,
      reason: `Engine folder not found: ${resolved}`,
      path: resolved,
    };
  }
  if (process.env.ENGINE_CONTROL_ENABLED !== "true") {
    return {
      enabled: false,
      reason: "Set ENGINE_CONTROL_ENABLED=true to allow web-triggered agent runs.",
      path: resolved,
    };
  }
  return { enabled: true, path: resolved };
}

function runPython(args: string[], cwd: string): Promise<{ ok: boolean; output: string; error?: string }> {
  const python = process.env.PYTHON_EXECUTABLE?.trim() || "python";
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(python, args, {
      cwd,
      env: process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        child.kill();
      }
    }, RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      if (finished) {
        return;
      }
      finished = true;
      resolve({
        ok: false,
        output: `${stdout}\n${stderr}`.trim(),
        error: error.message,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (finished) {
        return;
      }
      finished = true;
      const output = `${stdout}\n${stderr}`.trim();
      resolve({
        ok: code === 0,
        output: output || `Process completed in ${Date.now() - started}ms`,
        error: code === 0 ? undefined : `Python process exited with code ${code ?? -1}`,
      });
    });
  });
}

async function runSingleStage(stage: Exclude<EngineStage, "full_cycle">, runDate: string, cwd: string) {
  const args =
    stage === "ingest"
      ? ["-m", "src.ops.run_ingest"]
      : stage === "propose"
        ? ["-m", "src.ops.run_propose", "--date", runDate]
        : stage === "execute"
          ? ["-m", "src.ops.run_execute", "--date", runDate]
          : ["-m", "src.ops.run_train", "--mode", "weekly"];
  return runPython(args, cwd);
}

export async function runEngine(stage: EngineStage, runDate: string): Promise<EngineRunResult> {
  const availability = engineControlAvailability();
  if (!availability.enabled) {
    return {
      ok: false,
      stage,
      durationMs: 0,
      output: "",
      error: availability.reason ?? "Engine control disabled.",
    };
  }

  const started = Date.now();

  if (stage !== "full_cycle") {
    const result = await runSingleStage(stage, runDate, availability.path);
    return {
      ok: result.ok,
      stage,
      durationMs: Date.now() - started,
      output: result.output,
      error: result.error,
    };
  }

  const parts: Array<Exclude<EngineStage, "full_cycle">> = ["ingest", "propose", "train"];
  const logs: string[] = [];
  for (const part of parts) {
    const result = await runSingleStage(part, runDate, availability.path);
    logs.push(`== ${part.toUpperCase()} ==\n${result.output}`);
    if (!result.ok) {
      return {
        ok: false,
        stage,
        durationMs: Date.now() - started,
        output: logs.join("\n\n"),
        error: result.error ?? `${part} failed`,
      };
    }
  }

  return {
    ok: true,
    stage,
    durationMs: Date.now() - started,
    output: logs.join("\n\n"),
  };
}
