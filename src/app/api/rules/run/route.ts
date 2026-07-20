import { NextResponse } from "next/server";
import { applyRulesToAll } from "@/lib/rules";

// POST /api/rules/run — run every active rule against all transactions
export async function POST() {
  const result = await applyRulesToAll();
  return NextResponse.json(result);
}
