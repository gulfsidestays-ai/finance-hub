import SharesView from "@/components/SharesView";

export const dynamic = "force-dynamic";

export default function SharingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sharing</h1>
        <p className="text-sm text-muted mt-1">Share read-only access with a partner or advisor.</p>
      </div>
      <SharesView />
    </div>
  );
}
