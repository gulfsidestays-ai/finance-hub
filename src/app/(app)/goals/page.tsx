import GoalsView from "@/components/GoalsView";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-muted mt-1">Save up for what matters and project your path to debt-free.</p>
      </div>
      <GoalsView />
    </div>
  );
}
