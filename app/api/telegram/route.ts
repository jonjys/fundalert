import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/config";
import { setTelegramWatchlist } from "@/lib/store"; // lägg till denna i store

function commandOf(text: string): string {
  return text.split(/\s+/)[0]?.split("@")[0]?.toLowerCase()?? "";
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false }, { status: 503 });

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
    reply = `👋 Welcome to Fundalert.\n\n${origin}\n\nCommands: /alerts /id /alert BNCUSDT`;
  }
  if (command === "/alerts") {
    reply = `🔔 Fundalert Alerts\n\nYour Chat ID:\n${chatId}\n\nOpen:\n${origin}/alerts`;
  }
  if (command === "/id") {
    reply = `Your Chat ID is:\n${chatId}`;
  }

  // NYTT - lås till specifik trade
  if (command === "/alert") {
    const symbol = text.split(/\s+/)[1]?.toUpperCase()?.trim();
    if (!symbol) {
      reply = `Skicka: /alert BNCUSDT\nEller /alert ALL för att låsa upp`;
    } else {
      if (symbol === "ALL") {
        await setTelegramWatchlist(chatId, "");
        reply = `🔓 Upplåst - du får alerts för ALLA nu`;
      } else {
        await setTelegramWatchlist(chatId, symbol);
        reply = `🔒 Alerts låsta till ${symbol} ✅\nBara pings för ${symbol} nu`;
      }
    }
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });
  } catch {}

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "Fundalert Telegram webhook" });
}
