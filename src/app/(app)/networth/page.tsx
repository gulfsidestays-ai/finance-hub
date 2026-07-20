import { computeNetWorth } from "@/lib/networth";
import AssetsView from "@/components/AssetsView";

export const dynamic = "force-dynamic";

export default async function NetWorthPage() {
  const nw = await computeNetWorth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Net Worth</h1>
        <p className="text-sm text-muted mt-1">All your accounts plus manual assets and liabilities.</p>
      </div>
      <AssetsView nw={{ totalAssets: nw.totalAssets, totalLiabilities: nw.totalLiabilities, netWorth: nw.netWorth }} />
    </div>
  );
}
