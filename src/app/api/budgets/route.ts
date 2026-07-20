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
  const { category, categoryId, monthlyLimit, rollover } = body;
  if (monthlyLimit == null || (!category && !categoryId)) {
    return NextResponse.json({ error: "category (or categoryId) and monthlyLimit are required" }, { status: 400 });
  }

  let resolvedName = category;
  let resolvedCategoryId = categoryId ?? null;
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (cat) resolvedName = cat.name;
  }
  if (!resolvedName) {
    return NextResponse.json({ error: "Category not found" }, { status: 400 });
  }

  const budget = await prisma.budget.upsert({
    where: { category: resolvedName },
    update: { monthlyLimit: Number(monthlyLimit), rollover: rollover ?? false, categoryId: resolvedCategoryId },
    create: { category: resolvedName, categoryId: resolvedCategoryId, monthlyLimit: Number(monthlyLimit), rollover: rollover ?? false },
  });
  return NextResponse.json(budget, { status: 201 });
}
