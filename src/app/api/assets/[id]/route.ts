import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const data: any = {};
  for (const k of ["name", "category", "ticker", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (body.isLiability !== undefined) data.isLiability = Boolean(body.isLiability);
  if (body.value != null) data.value = Number(body.value);
  if (body.quantity != null) data.quantity = Number(body.quantity);
  const asset = await prisma.asset.update({ where: { id: params.id }, data });
  return NextResponse.json(asset);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.asset.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
