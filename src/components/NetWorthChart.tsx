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
  const height = 160;
  const padding = 10;

  const values = history.map((h) => h.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.netWorth - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const last = history[history.length - 1];
  const first = history[0];
  const trendUp = last.netWorth >= first.netWorth;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
        <polyline
          fill="none"
          stroke={trendUp ? "#22c55e" : "#ef4444"}
          strokeWidth="2"
          points={points.join(" ")}
        />
      </svg>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>{new Date(first.date).toLocaleDateString()} · {formatMoney(first.netWorth)}</span>
        <span>{new Date(last.date).toLocaleDateString()} · {formatMoney(last.netWorth)}</span>
      </div>
    </div>
  );
}
