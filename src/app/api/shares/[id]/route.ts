import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Revoke a share (soft delete).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.share.update({
    where: { id: params.id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
