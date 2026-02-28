export type MemberRole = "viewer" | "approver" | "admin";
export type InvestorCode = "alpha" | "beta" | "gamma";
export type InvestorStatus = "active" | "paused" | "locked";
export type RequestState =
  | "pending"
  | "approved"
  | "rejected"
  | "executed"
  | "cancelled";

export interface SessionUser {
  memberId: string;
  role: MemberRole;
}
