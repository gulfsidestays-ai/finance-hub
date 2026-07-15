import { NextResponse } from "next/server";
import { computeNetWorth } from "@/lib/networth";

export async function GET() {
  const { accounts, ...rest } = await computeNetWorth();
  return NextResponse.json(rest);
}
