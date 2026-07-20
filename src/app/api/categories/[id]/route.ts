import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/categories/[id] — update a category (rename, emoji, rollover, exclude)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.emoji !== undefined) data.emoji = body.emoji;
  if (body.rollover !== undefined) data.rollover = body.rollover;
  if (body.excludeFromBudget !== undefined) data.excludeFromBudget = body.excludeFromBudget;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const category = await prisma.category.update({ where: { id: params.id }, data });
  return NextResponse.json(category);
}

// DELETE /api/categories/[id] — only custom categories (system ones are protected)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (category.isSystem) {
    return NextResponse.json({ error: "System categories cannot be deleted" }, { status: 400 });
  }
  await prisma.category.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
