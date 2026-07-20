import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const k of ["ticker", "name", "type", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.shares != null) data.shares = Number(body.shares);
  if (body.costBasis != null) data.costBasis = Number(body.costBasis);
  if (body.currentPrice != null) data.currentPrice = Number(body.currentPrice);
  if (body.purchaseDate != null) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
  if (body.includeInNetWorth !== undefined) data.includeInNetWorth = body.includeInNetWorth;
  const holding = await prisma.holding.update({ where: { id: params.id }, data });
  return NextResponse.json(holding);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.holding.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
