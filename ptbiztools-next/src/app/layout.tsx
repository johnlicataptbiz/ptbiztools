import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "@/styles/corex-compat.css";
import "@/styles/discovery-call-grader.css";
import "@/styles/analysis-history.css";

const brandSans = Space_Grotesk({
  variable: "--font-brand-sans",
  subsets: ["latin"],
});

const brandMono = JetBrains_Mono({
  variable: "--font-brand-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PT Biz Tools",
  description: "PT Biz Coach workspace powered by Next.js 16 migration architecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${brandSans.variable} ${brandMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
