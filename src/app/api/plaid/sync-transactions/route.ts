import { NextResponse } from "next/server";
import { getPlaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const plaid = getPlaidClient();
    const items = await prisma.plaidItem.findMany({ include: { accounts: true } });

    let added = 0;
    let modified = 0;
    let removed = 0;

    for (const item of items) {
      let cursor = item.transactionsCursor ?? undefined;
      let hasMore = true;

      const accountByPlaidId = new Map(
        item.accounts.filter((a) => a.plaidAccountId).map((a) => [a.plaidAccountId as string, a.id])
      );

      while (hasMore) {
        const resp = await plaid.transactionsSync({
          access_token: item.accessToken,
          cursor,
        });
        const data = resp.data;

        for (const txn of data.added) {
          const localAccountId = accountByPlaidId.get(txn.account_id);
          if (!localAccountId) continue;
          await prisma.transaction.upsert({
            where: { plaidTransactionId: txn.transaction_id },
            update: {
              amount: txn.amount,
              pending: txn.pending,
              name: txn.name,
              category: txn.personal_finance_category?.primary ?? txn.category?.[0],
              subcategory: txn.personal_finance_category?.detailed ?? txn.category?.[1],
            },
            create: {
              accountId: localAccountId,
              plaidTransactionId: txn.transaction_id,
              name: txn.name,
              merchantName: txn.merchant_name ?? undefined,
              amount: txn.amount,
              isoCurrencyCode: txn.iso_currency_code ?? "USD",
              category: txn.personal_finance_category?.primary ?? txn.category?.[0],
              subcategory: txn.personal_finance_category?.detailed ?? txn.category?.[1],
              date: new Date(txn.date),
              pending: txn.pending,
            },
          });
          added++;
        }

        for (const txn of data.modified) {
          await prisma.transaction.updateMany({
            where: { plaidTransactionId: txn.transaction_id },
            data: {
              amount: txn.amount,
              pending: txn.pending,
              name: txn.name,
            },
          });
          modified++;
        }

        for (const txn of data.removed) {
          if (!txn.transaction_id) continue;
          await prisma.transaction.deleteMany({
            where: { plaidTransactionId: txn.transaction_id },
          });
          removed++;
        }

        cursor = data.next_cursor;
        hasMore = data.has_more;
      }

      await prisma.plaidItem.update({
        where: { id: item.id },
        data: { transactionsCursor: cursor },
      });

      // Refresh account balances while we're at it.
      const balances = await plaid.accountsGet({ access_token: item.accessToken });
      for (const acct of balances.data.accounts) {
        const localId = accountByPlaidId.get(acct.account_id);
        if (!localId) continue;
        await prisma.account.update({
          where: { id: localId },
          data: {
            currentBalance: acct.balances.current ?? 0,
            availableBalance: acct.balances.available ?? undefined,
            creditLimit: acct.balances.limit ?? undefined,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, added, modified, removed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.response?.data?.error_message || err?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
