import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { getPlaidClient } from "@/lib/plaid";

export async function POST() {
  try {
    const plaid = getPlaidClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: "finance-hub-single-user" },
      client_name: "Finance Hub",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create link token" },
      { status: 500 }
    );
  }
}
