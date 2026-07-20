import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Cash flow: income vs spending, by month and by category.
// Plaid convention: amount > 0 = money out (spending), amount < 0 = money in (income).
// Splits, when present, override the parent transaction's categorization.
// ---------------------------------------------------------------------------

export type CashFlowMonth = {
  month: string; // YYYY-MM
  income: number;
  spending: number;
  net: number;
  savingsRate: number; // income > 0 ? (net / income) : 0
};

export type CategoryBreakdown = {
  categoryId: string | null;
  category: string;
  emoji: string | null;
  amount: number; // positive = spending, negative = income
  count: number;
};

export async function computeCashFlow(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start } },
    include: {
      splits: { include: { category: true } },
      categoryRef: true,
    },
  });

  // Monthly aggregation
  const byMonth: Record<string, CashFlowMonth> = {};
  // Category aggregation (current month-to-date + prior month for context)
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const categoryMap: Record<string, CategoryBreakdown> = {};

  function bucket(month: string, amount: number) {
    if (!byMonth[month]) {
      byMonth[month] = { month, income: 0, spending: 0, net: 0, savingsRate: 0 };
    }
    if (amount < 0) byMonth[month].income += -amount;
    else byMonth[month].spending += amount;
  }

  function catBucket(key: string, name: string, emoji: string | null, amount: number) {
    if (!categoryMap[key]) {
      categoryMap[key] = { categoryId: null, category: name, emoji, amount: 0, count: 0 };
    }
    categoryMap[key].amount += amount;
    categoryMap[key].count += 1;
  }

  for (const t of transactions) {
    const d = new Date(t.date);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (t.splits.length > 0) {
      for (const s of t.splits) {
        bucket(month, s.amount);
        if (month === thisMonth) {
          const key = s.categoryId ?? `name:${s.category?.name ?? "Uncategorized"}`;
          catBucket(key, s.category?.name ?? "Uncategorized", s.category?.emoji ?? null, s.amount);
        }
      }
    } else {
      bucket(month, t.amount);
      if (month === thisMonth) {
        const key = t.categoryId ?? `name:${t.category ?? "Uncategorized"}`;
        catBucket(key, t.categoryRef?.name ?? t.category ?? "Uncategorized", t.categoryRef?.emoji ?? null, t.amount);
      }
    }
  }

  const monthly: CashFlowMonth[] = Object.values(byMonth).map((m) => {
    m.net = m.income - m.spending;
    m.savingsRate = m.income > 0 ? m.net / m.income : 0;
    return m;
  });
  monthly.sort((a, b) => a.month.localeCompare(b.month));

  const spendingByCategory = Object.values(categoryMap)
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const incomeByCategory = Object.values(categoryMap)
    .filter((c) => c.amount < 0)
    .sort((a, b) => a.amount - b.amount);

  return {
    monthly,
    spendingByCategory,
    incomeByCategory,
    totalIncome: monthly.reduce((s, m) => s + m.income, 0),
    totalSpending: monthly.reduce((s, m) => s + m.spending, 0),
  };
}
