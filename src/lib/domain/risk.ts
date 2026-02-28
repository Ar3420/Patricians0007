import type { InvestorCode, InvestorStatus } from "@/src/lib/domain/types";

export const RISK_RULES = {
  MAX_REQUESTS_PER_INVESTOR_PER_DAY: 2,
  MAX_SINGLE_POSITION_PER_SLEEVE_PCT: 20,
  MAX_SYMBOL_EXPOSURE_ACROSS_SLEEVES_PCT: 40,
  GAMMA_PAUSE_DRAWDOWN_PCT: 15,
  BETA_REDUCE_DRAWDOWN_PCT: 20,
  BETA_REDUCED_CAP_PCT: 15,
  DEFAULT_SLIPPAGE_BPS: 10,
  SLEEVE_WEIGHTS: {
    alpha: 40,
    beta: 35,
    gamma: 25,
  },
} as const;

export interface RiskCheckInput {
  investorCode: InvestorCode;
  investorStatus: InvestorStatus;
  symbol: string;
  targetPct: number;
  symbolExposurePct: number;
  drawdownPct: number;
}

export function evaluateRiskWarnings(input: RiskCheckInput): string[] {
  const warnings: string[] = [];

  if (input.investorStatus === "paused" || input.investorStatus === "locked") {
    warnings.push(`${input.investorCode.toUpperCase()} is ${input.investorStatus}.`);
  }
  if (input.targetPct > RISK_RULES.MAX_SINGLE_POSITION_PER_SLEEVE_PCT) {
    warnings.push("Exceeds max single position 20% per sleeve.");
  }
  if (input.symbolExposurePct > RISK_RULES.MAX_SYMBOL_EXPOSURE_ACROSS_SLEEVES_PCT) {
    warnings.push("Exceeds max symbol exposure 40% across sleeves.");
  }
  if (
    input.investorCode === "gamma" &&
    input.drawdownPct > RISK_RULES.GAMMA_PAUSE_DRAWDOWN_PCT
  ) {
    warnings.push("Gamma paused due to drawdown > 15%.");
  }
  if (
    input.investorCode === "beta" &&
    input.drawdownPct > RISK_RULES.BETA_REDUCE_DRAWDOWN_PCT &&
    input.targetPct > RISK_RULES.BETA_REDUCED_CAP_PCT
  ) {
    warnings.push("Beta cap reduced to 15% due to drawdown > 20%.");
  }
  if (
    input.investorCode === "alpha" &&
    input.drawdownPct > RISK_RULES.BETA_REDUCE_DRAWDOWN_PCT
  ) {
    warnings.push("Alpha may hold more cash due to drawdown > 20%.");
  }

  return warnings;
}

export function hardRiskBlocks(input: RiskCheckInput): string[] {
  return evaluateRiskWarnings(input).filter(
    (warning) => !warning.toLowerCase().includes("hold more cash"),
  );
}
