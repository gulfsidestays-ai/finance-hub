import TransactionsList from "@/components/TransactionsList";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <p className="text-muted text-sm mt-1">Search, categorize, review, tag, and split transactions.</p>
      </div>
      <TransactionsList />
    </div>
  );
}
