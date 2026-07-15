import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

function getEnv(): keyof typeof PlaidEnvironments {
  const env = (process.env.PLAID_ENV || "sandbox").toLowerCase();
  if (env === "production") return "production";
  if (env === "development") return "development";
  return "sandbox";
}

let client: PlaidApi | null = null;

/**
 * Lazily builds the Plaid client so the app can still boot (and other
 * features work) even before PLAID_CLIENT_ID / PLAID_SECRET are set.
 */
export function getPlaidClient(): PlaidApi {
  if (client) return client;

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      "Plaid is not configured yet. Sign up free at https://dashboard.plaid.com/signup, " +
        "grab your Sandbox client_id/secret, and set PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENV."
    );
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[getEnv()],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  client = new PlaidApi(configuration);
  return client;
}

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}
