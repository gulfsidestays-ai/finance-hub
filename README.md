# Finance Hub

A personal, single-user finance CRM: net worth, linked bank accounts (via Plaid),
transactions, budgets, recurring bills/subscriptions, and a credit-card
recommendation engine — all in one app, deployed on Railway.

This is built for **one user (you)**, gated behind a single shared password —
there's no multi-account signup system, which keeps it simple and cheap to run.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma ORM
- Plaid (bank account linking + transaction sync)
- Deployed on Railway

## 1. Get a Plaid account (required for bank sync)

Bank syncing needs your own Plaid developer account — this is free for Sandbox
and Development use:

1. Sign up at https://dashboard.plaid.com/signup
2. In the Plaid dashboard, grab your **Client ID** and **Sandbox secret**
   (Team Settings → Keys)
3. Sandbox mode uses fake banks/data — good for testing the whole flow with
   zero risk. When you're ready to link your *real* accounts, apply for
   Plaid's **Production** access (still free tier available for personal use)
   and swap in your Production secret + set `PLAID_ENV=production`.

You don't need this to use the rest of the app — accounts can also be added
manually — but bank sync won't work without it.

## 2. Local development

```bash
npm install
cp .env.example .env
# edit .env: set APP_PASSWORD, SESSION_SECRET (any random string), and
# DATABASE_URL (point at a local Postgres, or a Railway Postgres you've
# already provisioned — see below)

npm run db:push   # creates tables from prisma/schema.prisma
npm run dev        # http://localhost:3000
```

## 3. Deploy to Railway

1. Push this project to a GitHub repo (Railway deploys from GitHub).
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo.
3. **Add a Postgres database** to the same project: **+ New → Database →
   PostgreSQL**. Railway automatically wires `DATABASE_URL` into your app
   service's environment — you don't need to copy/paste it.
4. On the app service, go to **Variables** and add (Railway will prompt you
   to type these in yourself, not me — API keys shouldn't be handled by an
   assistant):
   - `APP_PASSWORD` — the password you'll use to log into the app
   - `SESSION_SECRET` — any random 32+ character string
   - `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` — from step 1
5. Railway will build and deploy automatically (`npm run build` runs
   `prisma generate && next build`). After the first deploy, run the schema
   push once via Railway's shell/CLI:
   ```bash
   railway run npm run db:push
   ```
6. Open the generated `*.up.railway.app` URL, log in with `APP_PASSWORD`,
   and connect your first account.

## What's included

- **Dashboard** — net worth (assets − liabilities) with a history sparkline,
  recent transactions, upcoming bills
- **Accounts** — connect via Plaid Link, or add manual accounts (cash, a
  house, a loan not tracked electronically, etc.)
- **Transactions** — synced from Plaid or entered manually
- **Budgets** — monthly limits per spending category, tracked against real
  transactions
- **Bills & Subscriptions** — recurring payments with due-day tracking
- **Credit Card Recommendations** — ranks a small reference set of cards by
  estimated net annual value against your actual trailing-12-month spend.
  **This is informational only, not financial advice** — the seed dataset in
  `src/lib/creditCards.ts` has placeholder terms; edit it with real, current
  offers you've verified on the issuer's site before trusting the rankings.

## Notes on security

- This app stores Plaid access tokens and account balances in your database.
  Treat `DATABASE_URL` and the Railway project itself as sensitive.
- The password gate is basic (single shared password, HMAC-signed cookie) —
  appropriate for personal use behind Railway's HTTPS, not for multi-user or
  public-facing deployments.
- Nothing in this app executes trades, moves money, or applies for credit on
  your behalf — it's read-only against your linked accounts (transactions +
  balances) and purely informational for the credit card rankings.
