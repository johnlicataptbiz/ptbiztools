import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { PTBIZCOACH_FAVICON_URL } from "@/constants/branding";
import "./globals.css";
import "@/styles/corex-compat.css";
import "@/styles/discovery-call-grader.css";
import "@/styles/analysis-history.css";
import "@/styles/tool-page.css";
import "@/styles/login.css";

const brandSans = Space_Grotesk({
  variable: "--font-brand-sans",
  subsets: ["latin"],
});

const brandMono = JetBrains_Mono({
  variable: "--font-brand-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PTBizCoach Workspace",
  description: "PTBizCoach workspace for discovery grading, sales call analysis, and P&L operations.",
  icons: {
    icon: PTBIZCOACH_FAVICON_URL,
    shortcut: PTBIZCOACH_FAVICON_URL,
    apple: PTBIZCOACH_FAVICON_URL,
  },
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
