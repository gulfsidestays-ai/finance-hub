"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

type Holding = {
  id: string; ticker: string; name: string; type: string;
  shares: number; costBasis: number; currentPrice: number;
  purchaseDate: string | null; includeInNetWorth: boolean;
  value: number; gainLoss: number;
};
type Bench = {
  available: boolean; latestClose: number | null; latestDate: string | null;
  benchmarkValue: number; benchmarkCostBasis: number; benchmarkReturn: number | null;
  excludedCostBasis: number;
  trailing: { m1: number | null; m3: number | null; y1: number | null; y3: number | null; y5: number | null };
};
type Data = {
  holdings: Holding[]; portfolioValue: number; totalCostBasis: number;
  totalGainLoss: number; portfolioReturn: number | null; allocation: Record<string, number>;
  benchmark: Bench;
};

const TYPE_COLORS: Record<string, string> = {
  stock: "bg-accent", etf: "bg-accent2", bond: "bg-warn", crypto: "bg-purple-500", cash: "bg-muted", other: "bg-gray-500",
};

function pct(p: number | null) {
  return p == null ? "—" : `${(p * 100).toFixed(2)}%`;
}

export default function InvestmentsView() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/holdings");
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: any = {
      ticker: (f.get("ticker") as string).toUpperCase(),
      name: f.get("name"),
      type: f.get("type"),
      shares: Number(f.get("shares")),
      costBasis: Number(f.get("costBasis")),
      currentPrice: Number(f.get("currentPrice")),
      purchaseDate: f.get("purchaseDate") || null,
    };
    await fetch("/api/holdings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowForm(false);
    (e.target as HTMLFormElement).reset();
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this holding?")) return;
    await fetch(`/api/holdings/${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  if (!data) return <p className="text-muted text-sm">Loading…</p>;

  const allocTotal = Object.values(data.allocation).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted text-sm">Track holdings, see allocation, and compare against the S&P 500.</p>
        <button className="btn-primary text-sm" onClick={() => setShowForm(!showForm)}>+ Add holding</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-muted">Portfolio value</div>
          <div className="text-2xl font-semibold">{formatMoney(data.portfolioValue)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Cost basis</div>
          <div className="text-2xl font-semibold">{formatMoney(data.totalCostBasis)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Total gain/loss</div>
          <div className={`text-2xl font-semibold ${data.totalGainLoss >= 0 ? "text-accent" : "text-danger"}`}>
            {formatMoney(data.totalGainLoss)}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Return</div>
          <div className={`text-2xl font-semibold ${(data.portfolioReturn ?? 0) >= 0 ? "text-accent" : "text-danger"}`}>
            {pct(data.portfolioReturn)}
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className="input" name="ticker" placeholder="Ticker (e.g. AAPL)" required />
          <input className="input sm:col-span-2" name="name" placeholder="Name" required />
          <select className="input" name="type" defaultValue="stock">
            <option value="stock">Stock</option><option value="etf">ETF</option><option value="bond">Bond</option>
            <option value="crypto">Crypto</option><option value="cash">Cash</option><option value="other">Other</option>
          </select>
          <input className="input" name="shares" type="number" step="0.0001" placeholder="Shares" required />
          <input className="input" name="costBasis" type="number" step="0.01" placeholder="Cost basis ($)" required />
          <input className="input" name="currentPrice" type="number" step="0.01" placeholder="Current price" required />
          <input className="input" name="purchaseDate" type="date" />
          <button className="btn-primary sm:col-span-4">Add holding</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-medium mb-3">Holdings</h2>
          {data.holdings.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide">
                  <th className="py-2">Holding</th><th>Shares</th><th>Price</th><th>Value</th><th>Gain/Loss</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-3">
                      <div className="font-medium">{h.ticker}</div>
                      <div className="text-xs text-muted">{h.name} · {h.type}</div>
                    </td>
                    <td>{h.shares}</td>
                    <td>{formatMoney(h.currentPrice)}</td>
                    <td>{formatMoney(h.value)}</td>
                    <td className={h.gainLoss >= 0 ? "text-accent" : "text-danger"}>{formatMoney(h.gainLoss)}</td>
                    <td><button className="text-xs text-danger hover:underline" onClick={() => remove(h.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-muted text-sm py-3">No holdings yet.</p>}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium mb-3">Allocation</h2>
          {data.holdings.length ? Object.entries(data.allocation).map(([type, val]) => (
            <div key={type} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize">{type}</span><span className="text-muted">{pct(val / allocTotal)}</span>
              </div>
              <div className="h-2 rounded-full bg-panel2 overflow-hidden">
                <div className={`h-full rounded-full ${TYPE_COLORS[type] || "bg-gray-500"}`} style={{ width: `${(val / allocTotal) * 100}%` }} />
              </div>
            </div>
          )) : <p className="text-muted text-sm">No data.</p>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium mb-3">S&P 500 benchmark</h2>
        {!data.benchmark.available ? (
          <p className="text-muted text-sm">Benchmark data unavailable right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-1">Your portfolio (dated holdings)</div>
              <div className="text-xl font-semibold">{formatMoney(data.benchmark.benchmarkCostBasis)}</div>
              <div className="text-sm text-muted">→ {formatMoney(data.benchmark.benchmarkValue)}</div>
              <div className={`text-sm font-medium ${(data.benchmark.benchmarkReturn ?? 0) >= 0 ? "text-accent" : "text-danger"}`}>
                Return: {pct(data.benchmark.benchmarkReturn)}
              </div>
              {data.benchmark.excludedCostBasis > 0 && (
                <div className="text-xs text-muted mt-2">Excluded (no purchase date): {formatMoney(data.benchmark.excludedCostBasis)}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted uppercase tracking-wide mb-1">S&P 500 trailing returns</div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[["1M", data.benchmark.trailing.m1], ["3M", data.benchmark.trailing.m3], ["1Y", data.benchmark.trailing.y1], ["3Y", data.benchmark.trailing.y3], ["5Y", data.benchmark.trailing.y5]].map(([lbl, v]) => (
                  <div key={lbl as string}>
                    <div className="text-xs text-muted">{lbl as string}</div>
                    <div className={`text-sm ${(v as number ?? 0) >= 0 ? "text-accent" : "text-danger"}`}>{pct(v as number | null)}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted mt-3">Price return (excl. dividends). Latest close: {data.benchmark.latestDate}.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
