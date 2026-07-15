import { NextRequest, NextResponse } from "next/server";
import { getPlaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client";

function mapAccountType(plaidType: string): AccountType {
  switch (plaidType) {
    case "depository":
      return AccountType.checking;
    case "credit":
      return AccountType.credit_card;
    case "loan":
      return AccountType.loan;
    case "investment":
      return AccountType.investment;
    default:
      return AccountType.other;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { public_token } = await req.json();
    if (!public_token) {
      return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
    }

    const plaid = getPlaidClient();
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    const itemInfo = await plaid.itemGet({ access_token: accessToken });
    const institutionId = itemInfo.data.item.institution_id ?? undefined;

    let institutionName: string | undefined;
    if (institutionId) {
      const inst = await plaid.institutionsGetById({
        institution_id: institutionId,
        country_codes: ["US" as any],
      });
      institutionName = inst.data.institution.name;
    }

    const plaidItem = await prisma.plaidItem.create({
      data: {
        itemId,
        accessToken,
        institutionId,
        institutionName,
      },
    });

    const accountsResponse = await plaid.accountsGet({ access_token: accessToken });

    const created = await Promise.all(
      accountsResponse.data.accounts.map((acct) =>
        prisma.account.create({
          data: {
            name: acct.name,
            officialName: acct.official_name ?? undefined,
            institutionName,
            type: mapAccountType(acct.type),
            subtype: acct.subtype ?? undefined,
            mask: acct.mask ?? undefined,
            currentBalance: acct.balances.current ?? 0,
            availableBalance: acct.balances.available ?? undefined,
            creditLimit: acct.balances.limit ?? undefined,
            isManual: false,
            plaidAccountId: acct.account_id,
            plaidItemId: plaidItem.id,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, accounts: created.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.response?.data?.error_message || err?.message || "Failed to link account" },
      { status: 500 }
    );
  }
}
