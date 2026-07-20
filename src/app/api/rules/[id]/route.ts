import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const k of ["name", "matchField", "matchType", "matchValue", "categoryId", "addTags", "sortOrder", "active", "setReviewed"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  const rule = await prisma.transactionRule.update({ where: { id: params.id }, data, include: { category: true } });
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.transactionRule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
