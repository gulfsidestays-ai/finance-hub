import { prisma } from "@/lib/prisma";
import AccountsList from "@/components/AccountsList";
import AddAccountForm from "@/components/AddAccountForm";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import SyncTransactionsButton from "@/components/SyncTransactionsButton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ isManual: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-muted text-sm mt-1">Bank accounts, cards, loans, and anything manual.</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncTransactionsButton />
          <PlaidLinkButton />
        </div>
      </div>

      <AccountsList accounts={accounts} />

      <AddAccountForm />
    </div>
  );
}
