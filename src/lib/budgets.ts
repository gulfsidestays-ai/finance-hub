import { prisma } from "./prisma";
import { normalizeCategory } from "./categories";

// Budget categories are stored using the same normalized set the credit-card
// recommendation engine uses (dining, groceries, travel, ...), so a budget
// lines up with spending regardless of the raw category string Plaid (or a
// manual entry) used.
export async function computeBudgets() {
  const [budgets, transactions] = await Promise.all([
    prisma.budget.findMany({ orderBy: { category: "asc" } }),
    prisma.transaction.findMany({
      where: {
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        amount: { gt: 0 },
      },
      select: { amount: true, category: true },
    }),
  ]);

  const spendByCategory: Record<string, number> = {};
  for (const t of transactions) {
    const cat = normalizeCategory(t.category);
    spendByCategory[cat] = (spendByCategory[cat] ?? 0) + t.amount;
  }

  return budgets.map((b) => ({ ...b, spent: spendByCategory[b.category] ?? 0 }));
}
