import { FREE_RATE_LIMIT } from "./config";
import type { ExchangeId, FundingRate, RatesPayload, SourceStatus } from "./types";

const CACHE_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "Fundalert/1.0 (funding-rate radar; informational; no trading)";

const BINANCE_URLS = [
  "https://fapi.binance.com/fapi/v1/premiumIndex",
  "https://www.binance.com/fapi/v1/premiumIndex",
];

const BYBIT_URLS = [
  "https://api.bybit.com/v5/market/tickers?category=linear",
  "https://api.bytick.com/v5/market/tickers?category=linear",
  "https://api2.bybit.com/v5/market/tickers?category=linear",
];

const OKX_MAJORS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "DOGE",
  "BNB",
  "ADA",
  "AVAX",
  "LINK",
  "SUI",
  "TON",
  "LTC",
];

type CacheEntry = { at: number; data: Omit<RatesPayload, "limited"> };

let cache: CacheEntry | null = null;
let inflight: Promise<Omit<RatesPayload, "limited">> | null = null;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      accept: "application/json",
      "user-agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const snippet = (await res.text().catch(() => "")).slice(0, 180);
    throw new Error(`HTTP ${res.status}${snippet ? `: ${snippet}` : ""}`);
  }
  return res.json();
}

async function fetchFirst(urls: string[]): Promise<unknown> {
  const errors: string[] = [];
  for (const url of urls) {
    try {
      return await fetchJson(url);
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitSymbol(symbol: string): { base: string; quote: string } {
  const quotes = ["USDT", "USDC", "USD"];
  const upper = symbol.replace(/[-_]/g, "").toUpperCase();
  for (const quote of quotes) {
    if (upper.endsWith(quote) && upper.length > quote.length) {
      return { base: upper.slice(0, -quote.length), quote };
    }
  }
  return { base: upper, quote: "USDT" };
}

function annualized(fundingRate: number, intervalHours: number): number {
  const hours = intervalHours > 0 ? intervalHours : 8;
  return fundingRate * (365 * 24) / hours * 100;
}

function toRow(input: {
  exchange: ExchangeId;
  symbol: string;
  fundingRate: number;
  markPrice: number | null;
  nextFundingTime: number | null;
  intervalHours: number;
}): FundingRate {
  const { base, quote } = splitSymbol(input.symbol);
  return {
    exchange: input.exchange,
    symbol: input.symbol.toUpperCase().replace(/-SWAP$/i, "").replace(/-/g, ""),
    base,
    quote,
    fundingRate: input.fundingRate,
    fundingRatePct: input.fundingRate * 100,
    markPrice: input.markPrice,
    nextFundingTime: input.nextFundingTime,
    intervalHours: input.intervalHours,
    annualizedPct: annualized(input.fundingRate, input.intervalHours),
  };
}

function parseBinance(data: unknown): FundingRate[] {
  const list = Array.isArray(data) ? data : data ? [data] : [];
  const rows: FundingRate[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const symbol = String(rec.symbol || "");
    if (!symbol.endsWith("USDT") && !symbol.endsWith("USDC")) continue;
    if (symbol.includes("_")) continue;
    const fundingRate = asNumber(rec.lastFundingRate);
    if (fundingRate === null) continue;
    rows.push(
      toRow({
        exchange: "binance",
        symbol,
        fundingRate,
        markPrice: asNumber(rec.markPrice),
        nextFundingTime: asNumber(rec.nextFundingTime),
        intervalHours: 8,
      }),
    );
  }
  return rows;
}

function parseBybit(data: unknown): FundingRate[] {
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  if (rec.retCode !== 0 && rec.retCode !== undefined) {
    throw new Error(String(rec.retMsg || `Bybit retCode ${rec.retCode}`));
  }
  const result = rec.result && typeof rec.result === "object" ? (rec.result as Record<string, unknown>) : {};
  const list = Array.isArray(result.list) ? result.list : [];
  const rows: FundingRate[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const symbol = String(row.symbol || "");
    const fundingRate = asNumber(row.fundingRate);
    if (!symbol || fundingRate === null) continue;
    if (!symbol.includes("USDT") && !symbol.includes("USDC")) continue;
    const interval = asNumber(row.fundingIntervalHour) ?? 8;
    rows.push(
      toRow({
        exchange: "bybit",
        symbol,
        fundingRate,
        markPrice: asNumber(row.markPrice),
        nextFundingTime: asNumber(row.nextFundingTime),
        intervalHours: interval,
      }),
    );
  }
  return rows;
}

async function fetchOkxMajors(): Promise<FundingRate[]> {
  const settled = await Promise.allSettled(
    OKX_MAJORS.map(async (base) => {
      const instId = `${base}-USDT-SWAP`;
      const data = await fetchJson(
        `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`,
      );
      const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (String(rec.code) !== "0") {
        throw new Error(String(rec.msg || "OKX error"));
      }
      const list = Array.isArray(rec.data) ? rec.data : [];
      const item = list[0] as Record<string, unknown> | undefined;
      if (!item) throw new Error("empty");
      const fundingRate = asNumber(item.fundingRate);
      if (fundingRate === null) throw new Error("no rate");
      return toRow({
        exchange: "okx",
        symbol: `${base}USDT`,
        fundingRate,
        markPrice: null,
        nextFundingTime: asNumber(item.fundingTime) ?? asNumber(item.nextFundingTime),
        intervalHours: 8,
      });
    }),
  );
  const rows: FundingRate[] = [];
  for (const item of settled) {
    if (item.status === "fulfilled") rows.push(item.value);
  }
  if (rows.length === 0) {
    throw new Error("OKX majors returned no funding rates");
  }
  return rows;
}

async function loadUncached(): Promise<Omit<RatesPayload, "limited">> {
  const sources: Record<ExchangeId, SourceStatus> = {
    binance: "error",
    bybit: "error",
    okx: "error",
  };
  const errors: RatesPayload["errors"] = {};
  const rates: FundingRate[] = [];

  const tasks: Array<Promise<void>> = [
    fetchFirst(BINANCE_URLS)
      .then((data) => {
        rates.push(...parseBinance(data));
        sources.binance = "ok";
      })
      .catch((err: unknown) => {
        sources.binance = "error";
        errors.binance = err instanceof Error ? err.message : String(err);
      }),
    fetchFirst(BYBIT_URLS)
      .then((data) => {
        rates.push(...parseBybit(data));
        sources.bybit = "ok";
      })
      .catch((err: unknown) => {
        sources.bybit = "error";
        errors.bybit = err instanceof Error ? err.message : String(err);
      }),
    fetchOkxMajors()
      .then((rows) => {
        rates.push(...rows);
        sources.okx = "ok";
      })
      .catch((err: unknown) => {
        sources.okx = "error";
        errors.okx = err instanceof Error ? err.message : String(err);
      }),
  ];

  await Promise.all(tasks);

  rates.sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));

  return {
    fetchedAt: new Date().toISOString(),
    freeLimit: FREE_RATE_LIMIT,
    sources,
    errors,
    rates,
  };
}

export async function getRates(paid: boolean): Promise<RatesPayload> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    const rates = paid ? cache.data.rates : cache.data.rates.slice(0, FREE_RATE_LIMIT);
    return { ...cache.data, rates, limited: !paid };
  }
  if (!inflight) {
    inflight = loadUncached().finally(() => {
      inflight = null;
    });
  }
  const data = await inflight;
  cache = { at: Date.now(), data };
  const rates = paid ? data.rates : data.rates.slice(0, FREE_RATE_LIMIT);
  return { ...data, rates, limited: !paid };
}
