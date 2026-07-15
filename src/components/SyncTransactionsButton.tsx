"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncTransactionsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/plaid/sync-transactions", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Sync failed");
      return;
    }
    setMessage(`Synced: +${data.added} new, ${data.modified} updated`);
    router.refresh();
  }

  return (
    <div>
      <button onClick={sync} disabled={busy} className="btn-secondary">
        {busy ? "Syncing..." : "Sync transactions"}
      </button>
      {message && <p className="text-xs text-muted mt-1">{message}</p>}
    </div>
  );
}
