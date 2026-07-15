import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const account = await prisma.account.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      currentBalance: body.currentBalance != null ? Number(body.currentBalance) : undefined,
      creditLimit: body.creditLimit != null ? Number(body.creditLimit) : undefined,
    },
  });
  return NextResponse.json(account);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.account.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
