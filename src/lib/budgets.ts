import { prisma } from "./prisma";
import { normalizeCategory } from "./categories";

// ---------------------------------------------------------------------------
// Budget math. A budget is tied to a Category (preferred) or a legacy
// normalized spend-category name. Rollover budgets carry the prior-month
// surplus forward; excludeFromBudget categories are skipped from the global
// "available to budget" rollup (handled in the budgets page).
// ---------------------------------------------------------------------------

export async function computeBudgets() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [budgets, txnsThisMonth, txnsPrevMonth] = await Promise.all([
    prisma.budget.findMany({
      orderBy: [{ category: "asc" }],
      include: { categoryRef: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: monthStart }, amount: { gt: 0 } },
      select: { amount: true, category: true, categoryId: true, splits: { select: { amount: true, categoryId: true } } },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: prevMonthStart, lt: monthStart }, amount: { gt: 0 } },
      select: { amount: true, category: true, categoryId: true, splits: { select: { amount: true, categoryId: true } } },
    }),
  ]);

  // Build spend maps keyed by both categoryId and normalized category name.
  function addSpend(map: Record<string, number>, t: any) {
    if (t.splits.length > 0) {
      for (const s of t.splits) {
        if (s.categoryId) map[s.categoryId] = (map[s.categoryId] ?? 0) + s.amount;
      }
    } else {
      if (t.categoryId) map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amount;
      const norm = normalizeCategory(t.category);
      map[`norm:${norm}`] = (map[`norm:${norm}`] ?? 0) + t.amount;
    }
  }

  const spend: Record<string, number> = {};
  const prevSpend: Record<string, number> = {};
  txnsThisMonth.forEach((t) => addSpend(spend, t));
  txnsPrevMonth.forEach((t) => addSpend(prevSpend, t));

  return budgets.map((b) => {
    // Prefer categoryId match, else normalized name match.
    const key = b.categoryId ?? `norm:${normalizeCategory(b.category)}`;
    const spent = spend[key] ?? 0;
    const prevSpent = prevSpend[key] ?? 0;

    let rolloverAmount = 0;
    if (b.rollover) {
      rolloverAmount = Math.max(0, b.monthlyLimit - prevSpent);
    }

    const limit = b.monthlyLimit + rolloverAmount;
    return {
      ...b,
      spent,
      rolloverAmount,
      limit,
      remaining: limit - spent,
      pct: limit > 0 ? spent / limit : 0,
      over: spent > limit,
    };
  });
}

/** Sum of all "available to budget" spending categories this month,
 *  excluding categories flagged excludeFromBudget. Used for the budget
 *  overview header on the budgets page. */
export async function budgetOverview() {
  const budgets = await computeBudgets();
  const totalLimit = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  return { totalLimit, totalSpent, remaining: totalLimit - totalSpent, count: budgets.length };
}
