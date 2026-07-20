import { validateShareToken, Scope } from "@/lib/sharing";
import { computeNetWorth } from "@/lib/networth";
import { computeCashFlow } from "@/lib/cashflow";
import { projectAllGoals } from "@/lib/goals";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SCOPE_LABELS: Record<string, string> = {
  dashboard: "Overview", networth: "Net Worth", cashflow: "Cash Flow",
  goals: "Goals", investments: "Investments", bills: "Bills",
};

export default async function SharePage({ params }: { params: { token: string } }) {
  const share = await validateShareToken(params.token);
  if (!share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] p-6">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Link unavailable</h1>
          <p className="text-sm text-muted">This shared link is invalid, expired, or has been revoked. Please request a new link.</p>
        </div>
      </div>
    );
  }

  const scopes = new Set<Scope>(share.scopes);
  const nw = scopes.has("networth") || scopes.has("dashboard") ? await computeNetWorth() : null;
  const cf = scopes.has("cashflow") || scopes.has("dashboard") ? await computeCashFlow(3) : null;
  const goals = scopes.has("goals") ? await projectAllGoals() : null;
  const bills = scopes.has("bills") ? await prisma.bill.findMany({ where: { active: true }, orderBy: { nextDueDate: "asc" } }) : null;
  let holdings: { portfolioValue: number; totalCostBasis: number; totalGainLoss: number } | null = null;
  if (scopes.has("investments")) {
    const rows = await prisma.holding.findMany();
    let pv = 0, cb = 0;
    for (const h of rows) { pv += h.shares * h.currentPrice; cb += h.costBasis; }
    holdings = { portfolioValue: pv, totalCostBasis: cb, totalGainLoss: pv - cb };
  }

  const last3 = cf?.monthly?.slice(-3) ?? [];
  const avgIncome = last3.length ? last3.reduce((s, m) => s + m.income, 0) / last3.length : 0;
  const avgSpending = last3.length ? last3.reduce((s, m) => s + m.spending, 0) / last3.length : 0;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white">
      <header className="border-b border-[#232a38] px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">Shared Finance Overview</h1>
          <p className="text-xs text-muted">Read-only access for {share.name} · {share.role}</p>
        </div>
        <div className="text-xs text-muted">Scopes: {share.scopes.map((s) => SCOPE_LABELS[s] || s).join(", ")}</div>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {nw && (
            <div className="card p-5">
              <div className="text-sm text-muted">Net worth</div>
              <div className="text-2xl font-semibold">{formatMoney(nw.netWorth)}</div>
              <div className="text-xs text-muted mt-1">Assets {formatMoney(nw.totalAssets)} · Liabilities {formatMoney(nw.totalLiabilities)}</div>
            </div>
          )}
          {cf && (
            <>
              <div className="card p-5">
                <div className="text-sm text-muted">Avg monthly income</div>
                <div className="text-2xl font-semibold text-accent">{formatMoney(avgIncome)}</div>
              </div>
              <div className="card p-5">
                <div className="text-sm text-muted">Avg monthly spending</div>
                <div className="text-2xl font-semibold text-danger">{formatMoney(avgSpending)}</div>
              </div>
            </>
          )}
        </div>

        {goals && goals.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-medium mb-3">Goals</h2>
            <div className="space-y-3">
              {goals.map((g) => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{g.name}</span>
                    <span className="text-muted">{Math.round(g.progress * 100)}% · {g.projectedCompletionDate ? new Date(g.projectedCompletionDate).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-panel2 overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round(g.progress * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {holdings && (
          <div className="card p-5">
            <h2 className="text-sm font-medium mb-3">Investments</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-muted">Value</div><div className="text-lg font-semibold">{formatMoney(holdings.portfolioValue)}</div></div>
              <div><div className="text-xs text-muted">Cost basis</div><div className="text-lg font-semibold">{formatMoney(holdings.totalCostBasis)}</div></div>
              <div><div className="text-xs text-muted">Gain/Loss</div><div className={`text-lg font-semibold ${holdings.totalGainLoss >= 0 ? "text-accent" : "text-danger"}`}>{formatMoney(holdings.totalGainLoss)}</div></div>
            </div>
          </div>
        )}

        {bills && bills.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-medium mb-3">Upcoming bills</h2>
            <div className="space-y-2">
              {bills.slice(0, 8).map((b) => (
                <div key={b.id} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                  <span>{b.name}</span>
                  <span className="text-muted">{b.nextDueDate ? new Date(b.nextDueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : `Day ${b.dueDay}`} · {formatMoney(b.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted text-center">This link grants read-only aggregate access. Individual transactions are not shown.</p>
      </main>
    </div>
  );
}
