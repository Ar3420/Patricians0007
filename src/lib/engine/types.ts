export interface EngineControlState {
  ok: boolean;
  message: string;
  output: string;
  predictions: string[];
  mode: "queue" | "local";
  jobs: string[];
}

export interface WorkerStartState {
  ok: boolean;
  message: string;
}
