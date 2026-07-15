"use client";

import { useCallback, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Plaid: any;
  }
}

export default function PlaidLinkButton({ onLinked }: { onLinked?: () => void }) {
  const router = useRouter();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startLink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const tokenRes = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || "Could not start Plaid Link");

      const handler = window.Plaid.create({
        token: tokenData.link_token,
        onSuccess: async (public_token: string) => {
          const exchangeRes = await fetch("/api/plaid/exchange-public-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token }),
          });
          if (!exchangeRes.ok) {
            const d = await exchangeRes.json();
            setError(d.error || "Could not link account");
            return;
          }
          setBusy(false);
          onLinked?.();
          router.refresh();
        },
        onExit: () => setBusy(false),
      });
      handler.open();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }, [onLinked]);

  return (
    <div>
      <Script
        src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
        onLoad={() => setScriptLoaded(true)}
      />
      <button
        onClick={startLink}
        disabled={!scriptLoaded || busy}
        className="btn-primary"
      >
        {busy ? "Connecting..." : "+ Connect a bank account"}
      </button>
      {error && <p className="text-danger text-sm mt-2">{error}</p>}
    </div>
  );
}
