import InvestmentsView from "@/components/InvestmentsView";

export const dynamic = "force-dynamic";

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Investments</h1>
        <p className="text-sm text-muted mt-1">Holdings, allocation, and performance vs the S&P 500.</p>
      </div>
      <InvestmentsView />
    </div>
  );
}
