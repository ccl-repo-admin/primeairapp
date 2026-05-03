import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";

const inter = Inter({ subsets: ["latin"] });

const companyName = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "ClockHQ";

export const metadata: Metadata = {
  title: `${companyName} — Hub`,
  description: `Field service management for ${companyName}`,
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
