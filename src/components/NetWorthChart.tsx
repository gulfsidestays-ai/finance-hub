"use client";

import { formatMoney } from "@/lib/format";

type Point = { date: string; netWorth: number };

// Lightweight inline SVG sparkline — no charting library dependency needed.
export default function NetWorthChart({ history }: { history: Point[] }) {
  if (history.length < 2) {
    return (
      <p className="text-muted text-sm">
        Not enough history yet — check back after a few days of tracking.
      </p>
    );
  }

  const width = 800;
  const height = 180;
  const padding = 14;

  const values = history.map((h) => h.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.netWorth - min) / range) * (height - padding * 2);
    return { x, y, h };
  });
  const points = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `${pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${height - padding} L${pts[0].x},${height - padding} Z`;

  const last = history[history.length - 1];
  const first = history[0];
  const trendUp = last.netWorth >= first.netWorth;
  const stroke = trendUp ? "#22c55e" : "#ef4444";
  const gid = "nw-grad";

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gid})`} />
        <polyline fill="none" stroke={stroke} strokeWidth="2.5" points={points} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill={stroke} />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{new Date(first.date).toLocaleDateString()} · {formatMoney(first.netWorth)}</span>
        <span>{new Date(last.date).toLocaleDateString()} · {formatMoney(last.netWorth)}</span>
      </div>
    </div>
  );
}
