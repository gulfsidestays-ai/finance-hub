import { NextResponse } from "next/server";
import { computeNetWorth } from "@/lib/networth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { accounts, ...rest } = await computeNetWorth();
  return NextResponse.json(rest);
}
