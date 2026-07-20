import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Shared access (Phase 7): revocable, scoped, read-only share links.
// Tokens are stored hashed (sha256). The raw token is shown once at creation.
// ---------------------------------------------------------------------------

import { randomBytes, createHash } from "crypto";

export const ALL_SCOPES = ["dashboard", "networth", "cashflow", "goals", "investments", "bills"] as const;
export type Scope = (typeof ALL_SCOPES)[number];

export function generateToken(): { token: string; tokenHash: string; tokenPreview: string } {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const tokenPreview = token.slice(-6);
  return { token, tokenHash, tokenPreview };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ValidatedShare = {
  id: string;
  name: string;
  role: string;
  scopes: Scope[];
  expiresAt: Date | null;
};

// Validate a raw token. Returns null if invalid/expired/revoked.
export async function validateShareToken(token: string): Promise<ValidatedShare | null> {
  if (!token || !/^[0-9a-f]{8,}$/.test(token)) return null;
  const tokenHash = hashToken(token);
  const share = await prisma.share.findUnique({ where: { tokenHash } });
  if (!share) return null;
  if (share.revokedAt) return null;
  if (share.expiresAt && share.expiresAt < new Date()) return null;
  // Update last accessed (fire-and-forget).
  prisma.share.update({ where: { id: share.id }, data: { lastAccessedAt: new Date() } }).catch(() => {});
  let scopes: Scope[] = [];
  try {
    const parsed = JSON.parse(share.scopes);
    if (Array.isArray(parsed)) scopes = parsed.filter((s) => ALL_SCOPES.includes(s));
  } catch {}
  return {
    id: share.id,
    name: share.name,
    role: share.role,
    scopes,
    expiresAt: share.expiresAt,
  };
}
