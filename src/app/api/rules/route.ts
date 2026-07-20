import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rules
export async function GET() {
  const rules = await prisma.transactionRule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { category: true },
  });
  return NextResponse.json(rules);
}

// POST /api/rules — create a rule. body.applyNow=true also runs it against existing txns
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.matchValue) {
    return NextResponse.json({ error: "matchValue is required" }, { status: 400 });
  }
  const rule = await prisma.transactionRule.create({
    data: {
      name: body.name ?? null,
      matchField: body.matchField ?? "name",
      matchType: body.matchType ?? "contains",
      matchValue: body.matchValue,
      categoryId: body.categoryId ?? null,
      setReviewed: body.setReviewed ?? false,
      addTags: body.addTags ?? null,
      sortOrder: body.sortOrder ?? 0,
      active: body.active ?? true,
    },
    include: { category: true },
  });
  return NextResponse.json(rule, { status: 201 });
}
