import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { restaurant } from "@/lib/restaurant";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"]
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: restaurant.seo.title,
  description: restaurant.seo.description,
  keywords: restaurant.seo.keywords,
  openGraph: {
    title: restaurant.seo.ogTitle,
    description: restaurant.seo.ogDescription,
    locale: restaurant.seo.locale
  }
};

export const viewport: Viewport = {
  themeColor: "#F7F6F2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}>
      <body className="grain overflow-x-hidden bg-bone text-ink">{children}</body>
    </html>
  );
}
