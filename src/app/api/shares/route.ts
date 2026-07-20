import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken, ALL_SCOPES } from "@/lib/sharing";

export const dynamic = "force-dynamic";

export async function GET() {
  const shares = await prisma.share.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, role: true, tokenPreview: true, scopes: true, expiresAt: true, revokedAt: true, lastAccessedAt: true, createdAt: true },
  });
  return NextResponse.json(shares);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, role, scopes, expiresAt } = body;
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const chosen: string[] = Array.isArray(scopes) ? scopes.filter((s: string) => (ALL_SCOPES as readonly string[]).includes(s)) : [...ALL_SCOPES];
  if (!chosen.length) return NextResponse.json({ error: "select at least one scope" }, { status: 400 });
  const { token, tokenHash, tokenPreview } = generateToken();
  const share = await prisma.share.create({
    data: {
      name,
      role: role || "viewer",
      tokenHash,
      tokenPreview,
      scopes: JSON.stringify(chosen),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  // Return the raw token ONCE (never retrievable again).
  return NextResponse.json({ id: share.id, token, name: share.name, role: share.role, scopes: chosen, expiresAt: share.expiresAt }, { status: 201 });
}
