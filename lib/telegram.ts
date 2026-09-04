const TELEGRAM_API = "https://api.telegram.org";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set" };
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; description?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.description || `Telegram HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function formatAlertMessage(input: {
  thresholdPct: number;
  rows: Array<{
    exchange: string;
    symbol: string;
    fundingRatePct: number;
    annualizedPct: number;
  }>;
}): string {
  const lines = [
    `<b>Fundalert</b> — funding threshold hit`,
    `(|funding| &gt; ${input.thresholdPct.toFixed(4)}%)`,
    "",
  ];
  for (const row of input.rows.slice(0, 12)) {
    const sign = row.fundingRatePct > 0 ? "+" : "";
    lines.push(
      `${row.exchange} <code>${row.symbol}</code> ${sign}${row.fundingRatePct.toFixed(4)}%  APR ${row.annualizedPct.toFixed(1)}%`,
    );
  }
  lines.push("", "<i>Informational only. Not financial advice. No custody, no auto-trading.</i>");
  return lines.join("\n");
}
