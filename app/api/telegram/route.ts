import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/config";

function commandOf(text: string): string {
  return text.split(/\s+/)[0]?.split("@")[0]?.toLowerCase() ?? "";
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" },
      { status: 503 },
    );
  }

  let update: {
    message?: { chat?: { id?: number }; text?: string };
    edited_message?: { chat?: { id?: number }; text?: string };
  };
  try {
    update = (await req.json()) as typeof update;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim() ?? "";

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  const origin = appUrl();
  const command = commandOf(text);
  let reply = "Fundalert bot is online ✅";

  if (command === "/start") {
    reply =
      "👋 Welcome to Fundalert.\n\nFunding-rate radar alerts and market signals.\nNo custody. No auto-trading.\n\n" +
      `${origin}\n\nCommands: /alerts /id`;
  }

  if (command === "/alerts") {
    reply =
      `🔔 Fundalert Alerts\n\nYour Telegram Chat ID:\n${chatId}\n\nOpen:\n${origin}/alerts\n\nPaste this Chat ID there to activate alerts.`;
  }

  if (command === "/id") {
    reply = `Your Telegram Chat ID is:\n${chatId}`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
      }),
    });
  } catch {
    // Acknowledge the update so Telegram does not retry forever.
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Fundalert Telegram webhook",
  });
}
