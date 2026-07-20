import BillsView from "@/components/BillsView";

export const dynamic = "force-dynamic";

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bills & Subscriptions</h1>
        <p className="text-muted text-sm mt-1">Recurring payments, auto-detected from your transactions and projected onto a calendar.</p>
      </div>
      <BillsView />
    </div>
  );
}
