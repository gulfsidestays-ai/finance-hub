import ForecastView from "@/components/ForecastView";

export const dynamic = "force-dynamic";

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Forecast</h1>
        <p className="text-sm text-muted mt-1">Project your cash flow and net worth, and model what-if scenarios.</p>
      </div>
      <ForecastView />
    </div>
  );
}
