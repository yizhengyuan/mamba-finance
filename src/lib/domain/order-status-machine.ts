export type OrderStatus = "active" | "closed" | "overdue";
export type PlanStatus = "pending" | "paid" | "overdue";

export interface RepaymentPlanSnapshot {
  dueDate: Date;
  status: PlanStatus;
}

interface DeriveOrderStatusInput {
  plans: RepaymentPlanSnapshot[];
  now?: Date;
  currentStatus?: OrderStatus;
}

function isPlanOverdue(plan: RepaymentPlanSnapshot, now: Date): boolean {
  if (plan.status === "paid") {
    return false;
  }

  return plan.dueDate.getTime() < now.getTime();
}

export function deriveOrderStatus({
  plans,
  now = new Date(),
  currentStatus,
}: DeriveOrderStatusInput): OrderStatus {
  if (currentStatus === "closed") {
    return "closed";
  }

  if (plans.length === 0) {
    return "active";
  }

  const allPaid = plans.every((plan) => plan.status === "paid");
  if (allPaid) {
    return "closed";
  }

  const hasOverdue = plans.some((plan) => isPlanOverdue(plan, now));
  return hasOverdue ? "overdue" : "active";
}

export function derivePlanStatus(
  plan: RepaymentPlanSnapshot,
  now: Date = new Date(),
): PlanStatus {
  if (plan.status === "paid") {
    return "paid";
  }

  return isPlanOverdue(plan, now) ? "overdue" : "pending";
}
