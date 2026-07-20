import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoryTree } from "@/lib/categories";

// GET /api/categories — returns the full group→category tree (auto-seeds defaults first)
export async function GET() {
  const groups = await getCategoryTree();
  return NextResponse.json(groups);
}

// POST /api/categories — create a custom category (or a group when body.createGroup=true)
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.createGroup) {
    const group = await prisma.categoryGroup.create({
      data: {
        name: body.name,
        type: body.type ?? "expense",
        sortOrder: body.sortOrder ?? 0,
      },
      include: { categories: true },
    });
    return NextResponse.json(group, { status: 201 });
  }

  if (!body.groupId || !body.name) {
    return NextResponse.json({ error: "groupId and name are required" }, { status: 400 });
  }
  const category = await prisma.category.create({
    data: {
      groupId: body.groupId,
      name: body.name,
      emoji: body.emoji ?? null,
      type: body.type ?? "expense",
      rollover: body.rollover ?? false,
      excludeFromBudget: body.excludeFromBudget ?? false,
      sortOrder: body.sortOrder ?? 0,
    },
  });
  return NextResponse.json(category, { status: 201 });
}
