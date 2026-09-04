import { NextResponse } from "next/server";
import { getAccessFromCookies } from "@/lib/access";
import { getRates } from "@/lib/rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forcePublic = url.searchParams.get("public") === "1";
  const access = forcePublic ? null : await getAccessFromCookies();
  const paid = Boolean(access?.ok);
  const payload = await getRates(paid);

  const healthy = Object.values(payload.sources).some((status) => status === "ok");
  return NextResponse.json(payload, {
    status: healthy || payload.rates.length > 0 ? 200 : 503,
    headers: {
      "cache-control": paid
        ? "private, max-age=15"
        : "public, s-maxage=30, stale-while-revalidate=30",
    },
  });
}
