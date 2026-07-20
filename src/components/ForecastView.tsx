"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMoney } from "@/lib/format";

type Point = { month: string; label: string; balance: number; netWorth: number; income: number; spending: number; net: number };
type Data = {
  startBalance: number; startNetWorth: number; avgIncome: number; avgSpending: number;
  monthlyBills: number; monthlyNet: number; points: Point[];
};

export default function ForecastView() {
  const [data, setData] = useState<Data | null>(null);
  const [incomeAdj, setIncomeAdj] = useState(0);
  const [spendingAdj, setSpendingAdj] = useState(0);
  const [extra, setExtra] = useState(0);

  const load = useCallback(async () => {
    const q = new URLSearchParams({
      months: "12",
      incomeAdjust: String(incomeAdj),
      spendingAdjust: String(spendingAdj),
      extraSavings: String(extra),
    });
    const r = await fetch("/api/forecast?" + q.toString());
    if (r.ok) setData(await r.json());
  }, [incomeAdj, spendingAdj, extra]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="text-muted text-sm">Loading…</p>;

  // Build a simple SVG line chart for net worth projection.
  const W = 720, H = 220, P = 36;
  const pts = data.points;
  const vals = pts.map((p) => p.netWorth).concat([data.startNetWorth]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const xStep = (W - 2 * P) / Math.max(pts.length - 1, 1);
  const y = (v: number) => H - P - ((v - min) / range) * (H - 2 * P);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${P + i * xStep},${y(p.netWorth)}`).join(" ");
  const areaPath = `${linePath} L${P + (pts.length - 1) * xStep},${H - P} L${P},${H - P} Z`;
  const end = pts[pts.length - 1];
  const trend = end.netWorth - data.startNetWorth;
  const zeroY = y(0);
  const showZero = min < 0 && max > 0;
  const trendColor = trend >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="text-sm text-muted">Avg monthly income</div>
          <div className="text-2xl font-semibold text-accent">{formatMoney(data.avgIncome)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Avg monthly spending</div>
          <div className="text-2xl font-semibold text-danger">{formatMoney(data.avgSpending)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Recurring bills / mo</div>
          <div className="text-2xl font-semibold">{formatMoney(data.monthlyBills)}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">Projected 12-mo change</div>
          <div className={`text-2xl font-semibold ${trend >= 0 ? "text-accent" : "text-danger"}`}>{formatMoney(trend)}</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium mb-3">Net worth projection (12 months)</h2>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          <defs>
            <linearGradient id="fc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {showZero && <line x1={P} y1={zeroY} x2={W - P} y2={zeroY} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />}
          <path d={areaPath} fill="url(#fc-grad)" />
          <path d={linePath} fill="none" stroke={trendColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={p.month} cx={P + i * xStep} cy={y(p.netWorth)} r={i === pts.length - 1 ? 4 : 2.5} fill={trendColor} />
          ))}
          {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
            <text key={p.month} x={P + (i * 2) * xStep} y={H - 8} fill="#8b93a7" fontSize={10} textAnchor="middle">{p.label}</text>
          ))}
        </svg>
        <div className="flex justify-between text-xs text-muted mt-2">
          <span>Start: {formatMoney(data.startNetWorth)}</span>
          <span>End ({end.label}): {formatMoney(end.netWorth)}</span>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium mb-4">Scenario modeling</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="label">Income adjustment: {(incomeAdj * 100).toFixed(0)}%</label>
            <input type="range" min={-0.5} max={0.5} step={0.05} value={incomeAdj} onChange={(e) => setIncomeAdj(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="label">Spending adjustment: {(spendingAdj * 100).toFixed(0)}%</label>
            <input type="range" min={-0.5} max={0.5} step={0.05} value={spendingAdj} onChange={(e) => setSpendingAdj(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="label">Extra savings: {formatMoney(extra)}/mo</label>
            <input type="range" min={0} max={2000} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="w-full" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-panel2 rounded-lg p-3">
            <div className="text-muted text-xs uppercase tracking-wide">Scenario net monthly</div>
            <div className={(data.monthlyNet >= 0 ? "text-accent" : "text-danger")}>{formatMoney(data.monthlyNet)}</div>
          </div>
          <div className="bg-panel2 rounded-lg p-3">
            <div className="text-muted text-xs uppercase tracking-wide">12-month projected balance</div>
            <div className={(end.balance >= 0 ? "text-accent" : "text-danger")}>{formatMoney(end.balance)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
