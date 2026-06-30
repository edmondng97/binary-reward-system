import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Geist Mono (local) carries every figure — tabular numerals are the soul of a
// settlement console. Display (Space Grotesk) + body (Inter) load via a link
// tag so the build has no font-fetch dependency.
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Binary Reward · Settlement Engine",
  description: "Binary reward network — volume, pairing, settlement, payout.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
