// S&P 500 price-return benchmark (Phase 5).
// Primary source: FRED SP500 CSV (no API key, server-side). Fallback: Yahoo Finance.
// Caches 24h. Price return only (dividends excluded).

const FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SP500";
const CACHE_MS = 24 * 60 * 60 * 1000;

type Row = { date: string; close: number }; // date = YYYY-MM-DD
let cache: { asOf: number; rows: Row[] } | null = null;

function fmt(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function fetchFred(from: Date, to: Date): Promise<Row[]> {
  const url = `${FRED}&cosd=${fmt(from)}&coed=${fmt(to)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",");
  const di = header.indexOf("date");
  const ci = header.length > 1 ? 1 : -1; // FRED: second column is the value
  if (di < 0 || ci < 0) return [];
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const close = parseFloat(cols[ci]);
    if (cols[di] && !isNaN(close)) rows.push({ date: cols[di], close });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

async function fetchYahoo(from: Date, to: Date): Promise<Row[]> {
  const p1 = Math.floor(from.getTime() / 1000);
  const p2 = Math.floor(to.getTime() / 1000) + 86400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=${p1}&period2=${p2}&interval=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];
  const ts: number[] = result.timestamp || [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
  const rows: Row[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c == null || isNaN(c)) continue;
    rows.push({ date: fmt(new Date(ts[i] * 1000)), close: c });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

async function getRows(): Promise<Row[]> {
  if (cache && Date.now() - cache.asOf < CACHE_MS) return cache.rows;
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 8);
  let rows = await fetchFred(from, to);
  if (!rows.length) rows = await fetchYahoo(from, to);
  if (rows.length) cache = { asOf: Date.now(), rows };
  return rows;
}

// First trading close on or after the given date.
export async function closeOnOrAfter(date: Date): Promise<number | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const target = fmt(date);
  for (const r of rows) {
    if (r.date >= target) return r.close;
  }
  return rows[rows.length - 1].close;
}

export async function latestClose(): Promise<{ close: number; date: string } | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  return { close: last.close, date: last.date };
}

// Trailing price-return % for a period (months back from latest close).
export async function trailingReturn(months: number): Promise<number | null> {
  const rows = await getRows();
  if (!rows.length) return null;
  const latest = rows[rows.length - 1].close;
  const target = new Date();
  target.setMonth(target.getMonth() - months);
  const targetStr = fmt(target);
  let base: number | null = null;
  for (const r of rows) {
    if (r.date >= targetStr) { base = r.close; break; }
  }
  if (base == null || base === 0) return null;
  return (latest - base) / base;
}

export async function sp500Status() {
  const rows = await getRows();
  return { available: rows.length > 0, count: rows.length };
}
