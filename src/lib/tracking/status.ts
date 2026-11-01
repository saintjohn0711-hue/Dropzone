import { normalizeOrderStatus, type OrderStatus } from "@/lib/admin/constants";

export const TRACKING_STEPS = [
  "placed",
  "assigned",
  "en_route",
  "delivered",
] as const;

export type TrackingStep = (typeof TRACKING_STEPS)[number];

export function orderToTrackingStep(status: string | null | undefined): TrackingStep {
  const n = normalizeOrderStatus(String(status || "pending")) as OrderStatus;
  if (n === "delivered") return "delivered";
  if (n === "en_route") return "en_route";
  if (n === "assigned") return "assigned";
  if (n === "canceled") return "placed"; // canceled stays early; UI shows canceled badge
  return "placed";
}

export function stepIndex(step: TrackingStep): number {
  return TRACKING_STEPS.indexOf(step);
}

export function isStepDone(current: TrackingStep, step: TrackingStep): boolean {
  return stepIndex(step) < stepIndex(current);
}

export function isStepCurrent(current: TrackingStep, step: TrackingStep): boolean {
  return step === current;
}
