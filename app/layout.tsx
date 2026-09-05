import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getAccessFromCookies } from "@/lib/access";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fundalert — Telegram trade cards when funding goes extreme",
    template: "%s · Fundalert",
  },
  description:
    "Telegram trade cards when perpetual funding goes extreme. Bias, size, timing, invalidation. Informational only — not financial advice. No custody, no auto-trading.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const access = await getAccessFromCookies();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="grid-bg min-h-full flex flex-col">
        <DisclaimerBanner />
        <Header access={access} />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
