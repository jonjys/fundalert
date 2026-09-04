import type { FundingRate } from "./types";

export function formatPct(value: number, digits = 4): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  }
  if (value >= 1) return value.toFixed(4);
  return value.toPrecision(4);
}

export function fundingTone(rate: number): "pos" | "neg" | "flat" {
  if (rate > 0.0000001) return "pos";
  if (rate < -0.0000001) return "neg";
  return "flat";
}

export function countdown(nextFundingTime: number | null, now = Date.now()): string {
  if (!nextFundingTime) return "—";
  const ms = nextFundingTime - now;
  if (ms <= 0) return "settling";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 48) return `${Math.floor(h / 24)}d`;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function annualizedLabel(row: FundingRate): string {
  return formatPct(row.annualizedPct, 1);
}

export function exchangeLabel(id: string): string {
  if (id === "binance") return "Binance";
  if (id === "bybit") return "Bybit";
  if (id === "okx") return "OKX";
  return id;
}
