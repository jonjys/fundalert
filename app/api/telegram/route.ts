import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing TELEGRAM_BOT_TOKEN" },
      { status: 500 }
    );
  }

  const update = await req.json();

  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  let reply = "Fundalert bot is online ✅";

  if (text === "/start") {
    reply =
      "👋 Welcome to Fundalert.\n\nFunding-rate radar alerts and market signals.\nNo custody. No auto-trading.\n\nhttps://fundalert-xi.vercel.app";
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply,
    }),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "Fundalert Telegram webhook",
  });
}
