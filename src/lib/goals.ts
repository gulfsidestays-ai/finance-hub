import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Goals: savings + debt-payoff projections (Phase 3).
//
// Savings goals: project completion from currentAmount + monthlyContribution.
//   - If linked to a savings/checking account, current = account.currentBalance.
//   - If a targetDate is set, compute required monthly contribution + on-track.
//
// Debt payoff goals: amortization from balance + APR + monthly payment.
//   - Balance comes from the linked credit_card/loan account (live), else Goal.currentAmount.
//   - APR stored as a percent (e.g. 24.99).
// ---------------------------------------------------------------------------

export type GoalProjection = {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number; // live current (balance saved, or debt remaining)
  startingAmount: number;
  progress: number; // 0..1
  remaining: number;
  monthlyContribution: number | null;
  targetDate: Date | null;
  // Projection
  monthsRemaining: number | null;
  projectedCompletionDate: Date | null;
  requiredMonthly: number | null; // to hit targetDate
  onTrack: boolean | null;
  shortfall: number | null; // monthly shortfall vs required
  status: "on_track" | "behind" | "ahead" | "complete" | "increase_payment" | "no_plan";
  totalInterest?: number; // debt only
  linkedAccountName?: string | null;
};

function monthsUntil(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + Math.round(months));
  return d;
}

export async function projectGoal(goal: any): Promise<GoalProjection> {
  const now = new Date();
  const isDebt = goal.type === "debt";

  // Resolve live current amount from linked account when available.
  let current = goal.currentAmount ?? 0;
  let linkedAccountName: string | null = null;
  if (goal.linkedAccountId) {
    const acct = await prisma.account.findUnique({
      where: { id: goal.linkedAccountId },
      select: { name: true, currentBalance: true, type: true },
    });
    if (acct) {
      linkedAccountName = acct.name;
      if (isDebt) {
        // Debt: balance is what's owed. Use abs to normalize sign conventions.
        current = Math.abs(acct.currentBalance ?? goal.currentAmount ?? 0);
      } else {
        // Savings: progress = account balance.
        current = acct.currentBalance ?? goal.currentAmount ?? 0;
      }
    }
  }

  const starting = goal.startingAmount ?? (isDebt ? current : 0);
  const target = goal.targetAmount;
  const monthly = goal.monthlyContribution ?? null;
  const targetDate = goal.targetDate ?? null;

  if (isDebt) {
    return projectDebt(goal, current, starting, target, monthly, targetDate, linkedAccountName);
  }
  return projectSavings(goal, current, starting, target, monthly, targetDate, linkedAccountName);
}

function projectSavings(
  goal: any, current: number, starting: number, target: number,
  monthly: number | null, targetDate: Date | null, linkedAccountName: string | null
): GoalProjection {
  const now = new Date();
  const remaining = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(1, current / target) : 0;

  if (remaining <= 0) {
    return base(goal, current, starting, target, progress, 0, monthly, targetDate, linkedAccountName, "complete", null, now, null, null);
  }

  // Required monthly contribution to hit targetDate.
  let requiredMonthly: number | null = null;
  if (targetDate) {
    const m = monthsUntil(now, targetDate);
    if (m > 0) requiredMonthly = remaining / m;
  }

  // Projected completion from monthly contribution.
  let monthsRemaining: number | null = null;
  let projectedCompletionDate: Date | null = null;
  if (monthly && monthly > 0) {
    monthsRemaining = Math.ceil(remaining / monthly);
    projectedCompletionDate = addMonths(now, monthsRemaining);
  }

  // On-track status.
  let status: GoalProjection["status"] = "no_plan";
  let onTrack: boolean | null = null;
  let shortfall: number | null = null;
  if (targetDate && requiredMonthly != null) {
    shortfall = monthly != null ? requiredMonthly - monthly : null;
    if (monthly == null) {
      status = "no_plan";
    } else if (monthly >= requiredMonthly) {
      status = "on_track"; onTrack = true;
    } else {
      status = "behind"; onTrack = false;
    }
  } else if (projectedCompletionDate) {
    status = "on_track";
  }

  return base(goal, current, starting, target, progress, remaining, monthly, targetDate, linkedAccountName, status, onTrack, projectedCompletionDate, monthsRemaining, requiredMonthly, shortfall);
}

function projectDebt(
  goal: any, balance: number, starting: number, target: number,
  payment: number | null, targetDate: Date | null, linkedAccountName: string | null
): GoalProjection {
  const now = new Date();
  // For debt, "progress" is how much paid down from starting balance.
  const remaining = Math.max(0, balance - target); // target usually 0
  const totalToPay = Math.max(1, starting > 0 ? starting - target : balance - target);
  const progress = Math.min(1, Math.max(0, (totalToPay - remaining) / totalToPay));

  if (remaining <= 0) {
    return { ...base(goal, balance, starting, target, 1, 0, payment, targetDate, linkedAccountName, "complete", null, now, 0, null, null), totalInterest: 0 };
  }

  const apr = goal.interestRate ?? 0;
  const r = apr / 100 / 12;

  if (!payment || payment <= 0) {
    return { ...base(goal, balance, starting, target, progress, remaining, payment, targetDate, linkedAccountName, "no_plan", null, null, null, null, null), totalInterest: 0 };
  }

  // Payment doesn't cover monthly interest -> never pays off.
  if (r > 0 && payment <= balance * r) {
    return { ...base(goal, balance, starting, target, progress, remaining, payment, targetDate, linkedAccountName, "increase_payment", null, null, null, null, null), totalInterest: 0 };
  }

  let months: number;
  let totalInterest = 0;
  if (r === 0) {
    months = Math.ceil(remaining / payment);
    totalInterest = 0;
  } else {
    // n = -ln(1 - rB/P) / ln(1 + r)
    const n = -Math.log(1 - (r * remaining) / payment) / Math.log(1 + r);
    months = Math.ceil(n);
    // Total interest = sum over months of interest accrued.
    // Approximate via total paid - principal.
    totalInterest = Math.max(0, months * payment - remaining);
  }

  // Guard against absurd projections.
  months = Math.min(months, 600);
  const projectedCompletionDate = addMonths(now, months);

  // Required monthly to hit targetDate.
  let requiredMonthly: number | null = null;
  let shortfall: number | null = null;
  let onTrack: boolean | null = null;
  let status: GoalProjection["status"] = "on_track";
  if (targetDate) {
    const m = monthsUntil(now, targetDate);
    if (m > 0) {
      if (r === 0) {
        requiredMonthly = remaining / m;
      } else {
        // Payment to pay off balance in exactly m months: P = rB / (1 - (1+r)^-m)
        requiredMonthly = (r * remaining) / (1 - Math.pow(1 + r, -m));
      }
      shortfall = payment - requiredMonthly;
      onTrack = payment >= requiredMonthly;
      status = onTrack ? "on_track" : "behind";
    }
  }

  return { ...base(goal, balance, starting, target, progress, remaining, payment, targetDate, linkedAccountName, status, onTrack, projectedCompletionDate, months, requiredMonthly, shortfall), totalInterest };
}

function base(
  goal: any, current: number, starting: number, target: number, progress: number,
  remaining: number, monthly: number | null, targetDate: Date | null,
  linkedAccountName: string | null, status: GoalProjection["status"],
  onTrack: boolean | null, projectedCompletionDate: Date | null,
  monthsRemaining: number | null, requiredMonthly: number | null, shortfall: number | null = null
): GoalProjection {
  return {
    id: goal.id, name: goal.name, type: goal.type,
    targetAmount: target, currentAmount: current, startingAmount: starting,
    progress, remaining, monthlyContribution: monthly, targetDate,
    monthsRemaining, projectedCompletionDate, requiredMonthly, onTrack, shortfall,
    status, linkedAccountName,
  };
}

export async function projectAllGoals() {
  const goals = await prisma.goal.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    include: { linkedAccount: { select: { name: true, type: true, currentBalance: true } } },
  });
  return Promise.all(goals.map(projectGoal));
}
