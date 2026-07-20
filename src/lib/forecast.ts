import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Cash-flow & net-worth forecasting (Phase 6).
// Projects monthly balances forward from:
//   - average monthly income/spending (last 3 months of transactions)
//   - active recurring bills (avgAmount)
//   - scenario adjustments (income %, spending %, extra savings)
// Plaid convention: amount > 0 = spending, amount < 0 = income.
// ---------------------------------------------------------------------------

export type ForecastPoint = {
  month: string; // YYYY-MM
  label: string; // e.g. "Aug 2026"
  balance: number; // projected liquid balance (checking/savings accounts)
  netWorth: number; // projected net worth
  income: number;
  spending: number;
  net: number;
};

export type ForecastInput = {
  months?: number; // projection horizon
  incomeAdjust?: number; // fractional, e.g. 0.1 = +10% income
  spendingAdjust?: number; // fractional, e.g. -0.1 = 10% less spending
  extraSavings?: number; // $/month moved to savings (reduces liquid balance, neutral to net worth)
};

export async function computeForecast(input: ForecastInput = {}) {
  const months = Math.min(Math.max(input.months ?? 12, 1), 60);
  const incomeAdjust = input.incomeAdjust ?? 0;
  const spendingAdjust = input.spendingAdjust ?? 0;
  const extraSavings = input.extraSavings ?? 0;

  const now = new Date();
  const lookback = new Date(now.getFullYear(), now.getMonth() - 2, 1); // last 3 months incl. current

  // Average monthly income & spending from transactions.
  const txns = await prisma.transaction.findMany({ where: { date: { gte: lookback } } });
  const monthMap: Record<string, { income: number; spending: number }> = {};
  for (const t of txns) {
    const m = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[m]) monthMap[m] = { income: 0, spending: 0 };
    if (t.amount < 0) monthMap[m].income += -t.amount;
    else monthMap[m].spending += t.amount;
  }
  const monthKeys = Object.keys(monthMap);
  const n = monthKeys.length || 1;
  const avgIncome = monthKeys.reduce((s, k) => s + monthMap[k].income, 0) / n;
  const avgSpending = monthKeys.reduce((s, k) => s + monthMap[k].spending, 0) / n;

  // Active recurring bills (avg monthly outflow).
  const bills = await prisma.bill.findMany({ where: { active: true } });
  let monthlyBills = 0;
  for (const b of bills) {
    const amt = b.avgAmount ?? b.lastAmount ?? b.amount ?? 0;
    // normalize to monthly equivalent
    switch (b.frequency) {
      case "weekly": monthlyBills += (amt * 52) / 12; break;
      case "biweekly": monthlyBills += (amt * 26) / 12; break;
      case "quarterly": monthlyBills += amt / 3; break;
      case "annual": monthlyBills += amt / 12; break;
      default: monthlyBills += amt; // monthly or null
    }
  }

  // Starting balances.
  const accounts = await prisma.account.findMany();
  const LIAB = ["credit_card", "loan"];
  let liquidAssets = 0;
  let liquidLiabilities = 0;
  for (const a of accounts) {
    if (LIAB.includes(a.type)) liquidLiabilities += a.currentBalance;
    else liquidAssets += a.currentBalance;
  }
  const startBalance = liquidAssets - liquidLiabilities;

  // Net worth baseline (reuse components: accounts + manual assets + holdings).
  const [assets, holdings] = await Promise.all([
    prisma.asset.findMany(),
    prisma.holding.findMany({ where: { includeInNetWorth: true } }),
  ]);
  let manualAssets = 0, manualLiab = 0;
  for (const a of assets) { if (a.isLiability) manualLiab += a.value; else manualAssets += a.value; }
  const holdingsValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);
  const startNetWorth = liquidAssets + manualAssets + holdingsValue - (liquidLiabilities + manualLiab);

  // Scenario-adjusted monthly flows.
  const adjIncome = avgIncome * (1 + incomeAdjust);
  const adjSpending = avgSpending * (1 + spendingAdjust);
  const monthlyNet = adjIncome - adjSpending; // already includes bills (they're transactions)

  // Project forward month by month.
  const points: ForecastPoint[] = [];
  let balance = startBalance;
  let netWorth = startNetWorth;
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 0; i < months; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const label = m.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    // Extra savings reduces liquid balance but is neutral to net worth (money moved, not spent).
    balance += monthlyNet - extraSavings;
    netWorth += monthlyNet;
    points.push({ month: key, label, balance, netWorth, income: adjIncome, spending: adjSpending, net: monthlyNet });
  }

  return {
    startBalance,
    startNetWorth,
    avgIncome,
    avgSpending,
    monthlyBills,
    monthlyNet,
    points,
  };
}
