import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const k of ["name", "type", "monthlyContribution", "linkedAccountId", "interestRate"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.targetAmount != null) data.targetAmount = Number(body.targetAmount);
  if (body.currentAmount != null) data.currentAmount = Number(body.currentAmount);
  if (body.startingAmount != null) data.startingAmount = Number(body.startingAmount);
  if (body.targetDate != null) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.active !== undefined) data.active = body.active;
  if (body.complete === true) data.completedAt = new Date();

  const goal = await prisma.goal.update({ where: { id: params.id }, data });
  return NextResponse.json(goal);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.goal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
