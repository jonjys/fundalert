import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { StickyTrialBar } from "@/components/sticky-trial-bar";
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
    default: "Fundalert — funding-carry trade cards you execute",
    template: "%s · Fundalert",
  },
  description:
    "Actionable funding-carry trade cards when perp funding goes extreme. Manual execution only. Trial 29 SEK / 3 days. No custody, no auto-trading.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const access = await getAccessFromCookies();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className={`grid-bg min-h-full flex flex-col ${access.ok ? "" : "pb-20 md:pb-0"}`}>
        <DisclaimerBanner />
        <Header access={access} />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        {!access.ok && <StickyTrialBar />}
      </body>
    </html>
  );
}
