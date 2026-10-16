import type { EngineerToolId } from "@/lib/engineerTools";
import { featureTier, type PlanId, type SelfServePlanId } from "@/lib/plans";

/** Lowest self-serve plan that includes each engineer tool. */
const REQUIRED_PLAN: Record<EngineerToolId, SelfServePlanId> = {
  drawing: "engineer",
  design: "engineer",
  itp: "professional",
  boq: "professional",
  schedule: "consultant",
  value: "consultant",
  dashboard: "consultant",
};

const TIER_RANK = {
  assistant: 0,
  engineer: 1,
  professional: 2,
  consultant: 3,
} as const;

export function toolRequiredPlan(toolId: EngineerToolId): SelfServePlanId {
  return REQUIRED_PLAN[toolId];
}

export function hasToolAccess(planId: PlanId | string | null | undefined, toolId: EngineerToolId) {
  const have = TIER_RANK[featureTier(planId)];
  const need = TIER_RANK[featureTier(REQUIRED_PLAN[toolId])];
  return have >= need;
}
