import { NextRequest, NextResponse } from "next/server";
import { appUrl, PAYMENT_LINKS, TELEGRAM_BOT_USERNAME } from "@/lib/config";
import { setTelegramWatchlistByChatId } from "@/lib/store";

function commandOf(text: string): string {
  return text.split(/\s+/)[0]?.split("@")[0]?.toLowerCase()?? "";
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 503 });
  }

  let update: any;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  const message = update.message?? update.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim()?? "";
  if (!chatId) return NextResponse.json({ ok: true });

  const origin = appUrl();
  const command = commandOf(text);
  let reply = "Fundalert bot is online ✅";

  if (command === "/start") {
    const trial = PAYMENT_LINKS.trial ?? `${origin}/#pricing`;
    reply = `👋 Fundalert — funding-carry trade cards. You execute.\n\nTrial 29 SEK / 3 days:\n${trial}\n\nTeasers: ${origin}/signals\nBot: @${TELEGRAM_BOT_USERNAME}\n\nCommands: /alerts /id /alert BNCUSDT`;
  }
  if (command === "/alerts") {
    reply = `🔔 Fundalert Alerts\n\nYour Telegram Chat ID:\n${chatId}\n\nOpen:\n${origin}/alerts`;
  }
  if (command === "/id") {
    reply = `Your Telegram Chat ID is:\n${chatId}`;
  }
  if (command === "/alert") {
    const symbol = text.split(/\s+/)[1]?.toUpperCase()?.trim() || "";
    if (!symbol) {
      reply = `Använd: /alert BNCUSDT\nEller /alert ALL för att låsa upp alla`;
    } else if (symbol === "ALL") {
      await setTelegramWatchlistByChatId(String(chatId), "");
      reply = `🔓 Upplåst - du får alerts för ALLA igen`;
    } else {
      await setTelegramWatchlistByChatId(String(chatId), symbol);
      reply = `🔒 Alerts låsta till ${symbol} ✅\nDu får bara pings för ${symbol} nu`;
    }
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });
  } catch {}

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Fundalert Telegram webhook" });
}
