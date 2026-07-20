import { computeCashFlow } from "@/lib/cashflow";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  const data = await computeCashFlow(6);
  const maxBar = Math.max(...data.monthly.map((m) => Math.max(m.income, m.spending)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cash Flow</h1>
        <p className="text-muted text-sm mt-1">Income vs spending over the last 6 months.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Income (6mo)</div>
          <div className="text-2xl font-semibold text-accent mt-1">{formatMoney(data.totalIncome)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Spending (6mo)</div>
          <div className="text-2xl font-semibold text-danger mt-1">{formatMoney(data.totalSpending)}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-muted uppercase tracking-wide">Net (6mo)</div>
          <div className="text-2xl font-semibold mt-1">{formatMoney(data.totalIncome - data.totalSpending)}</div>
          <div className="text-xs text-muted mt-1">
            Avg savings rate{" "}
            {data.totalIncome > 0
              ? Math.round(((data.totalIncome - data.totalSpending) / data.totalIncome) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div className="card p-5">
        <h2 className="text-sm font-medium mb-4">Monthly income vs spending</h2>
        <div className="flex items-end gap-4 h-56">
          {data.monthly.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-1 h-44">
                <div
                  className="w-1/2 bg-accent rounded-t"
                  style={{ height: `${(m.income / maxBar) * 100}%` }}
                  title={`Income ${formatMoney(m.income)}`}
                />
                <div
                  className="w-1/2 bg-danger rounded-t"
                  style={{ height: `${(m.spending / maxBar) * 100}%` }}
                  title={`Spending ${formatMoney(m.spending)}`}
                />
              </div>
              <div className="text-xs text-muted">{m.month.slice(5)}</div>
              <div className={`text-xs ${m.net >= 0 ? "text-accent" : "text-danger"}`}>{formatMoney(m.net)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spending by category (this month) */}
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-4">Spending by category (this month)</h2>
          {data.spendingByCategory.length === 0 ? (
            <p className="text-sm text-muted">No spending this month yet.</p>
          ) : (
            <div className="space-y-2">
              {data.spendingByCategory.slice(0, 10).map((c) => {
                const max = data.spendingByCategory[0]?.amount || 1;
                return (
                  <div key={c.category + (c.categoryId ?? "")}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{c.emoji} {c.category}</span>
                      <span className="text-muted">{formatMoney(c.amount)}</span>
                    </div>
                    <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full bg-accent2 rounded-full" style={{ width: `${(c.amount / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Income by category (this month) */}
        <div className="card p-5">
          <h2 className="text-sm font-medium mb-4">Income by category (this month)</h2>
          {data.incomeByCategory.length === 0 ? (
            <p className="text-sm text-muted">No income this month yet.</p>
          ) : (
            <div className="space-y-2">
              {data.incomeByCategory.map((c) => {
                const max = data.incomeByCategory[0]?.amount || 1;
                return (
                  <div key={c.category + (c.categoryId ?? "")}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{c.emoji} {c.category}</span>
                      <span className="text-muted">{formatMoney(-c.amount)}</span>
                    </div>
                    <div className="h-2 bg-panel2 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${(-c.amount / -max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
