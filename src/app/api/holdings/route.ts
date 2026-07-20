import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeOnOrAfter, latestClose, trailingReturn } from "@/lib/benchmark";

export const dynamic = "force-dynamic";

export async function GET() {
  const holdings = await prisma.holding.findMany({ orderBy: [{ type: "asc" }, { ticker: "asc" }] });

  // Portfolio aggregates
  let portfolioValue = 0;
  let totalCostBasis = 0;
  const allocation: Record<string, number> = {};
  const enriched = holdings.map((h) => {
    const value = h.shares * h.currentPrice;
    portfolioValue += value;
    totalCostBasis += h.costBasis;
    allocation[h.type] = (allocation[h.type] || 0) + value;
    return { ...h, value, gainLoss: value - h.costBasis };
  });

  const totalGainLoss = portfolioValue - totalCostBasis;
  const portfolioReturn = totalCostBasis > 0 ? totalGainLoss / totalCostBasis : null;

  // Benchmark: cost-weighted hypothetical S&P 500 value for dated holdings.
  let benchmarkValue = 0;
  let benchmarkCostBasis = 0;
  let excludedCostBasis = 0;
  const latest = await latestClose();
  for (const h of holdings) {
    if (!h.purchaseDate || !latest) { excludedCostBasis += h.costBasis; continue; }
    const base = await closeOnOrAfter(new Date(h.purchaseDate));
    if (base && base > 0) {
      benchmarkValue += (h.costBasis * latest.close) / base;
      benchmarkCostBasis += h.costBasis;
    } else {
      excludedCostBasis += h.costBasis;
    }
  }
  const benchmarkReturn = benchmarkCostBasis > 0 ? (benchmarkValue - benchmarkCostBasis) / benchmarkCostBasis : null;

  // S&P 500 trailing returns for context.
  const [r1m, r3m, r1y, r3y, r5y] = await Promise.all([
    trailingReturn(1), trailingReturn(3), trailingReturn(12), trailingReturn(36), trailingReturn(60),
  ]);

  return NextResponse.json({
    holdings: enriched,
    portfolioValue,
    totalCostBasis,
    totalGainLoss,
    portfolioReturn,
    allocation,
    benchmark: {
      available: !!latest,
      latestClose: latest?.close ?? null,
      latestDate: latest?.date ?? null,
      benchmarkValue,
      benchmarkCostBasis,
      benchmarkReturn,
      excludedCostBasis,
      trailing: { m1: r1m, m3: r3m, y1: r1y, y3: r3y, y5: r5y },
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ticker, name, type, shares, costBasis, currentPrice, purchaseDate, includeInNetWorth, notes } = body;
  if (!ticker || !name) {
    return NextResponse.json({ error: "ticker and name are required" }, { status: 400 });
  }
  const holding = await prisma.holding.create({
    data: {
      ticker,
      name,
      type: type ?? "stock",
      shares: Number(shares) || 0,
      costBasis: Number(costBasis) || 0,
      currentPrice: Number(currentPrice) || 0,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      includeInNetWorth: includeInNetWorth !== false,
      notes: notes || null,
    },
  });
  return NextResponse.json(holding, { status: 201 });
}
