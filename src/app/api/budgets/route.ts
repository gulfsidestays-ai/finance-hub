import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeBudgets } from "@/lib/budgets";

export const dynamic = "force-dynamic";

export async function GET() {
  const budgets = await computeBudgets();
  return NextResponse.json(budgets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, monthlyLimit } = body;
  if (!category || monthlyLimit == null) {
    return NextResponse.json({ error: "category and monthlyLimit are required" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { category },
    update: { monthlyLimit: Number(monthlyLimit) },
    create: { category, monthlyLimit: Number(monthlyLimit) },
  });
  return NextResponse.json(budget, { status: 201 });
}
