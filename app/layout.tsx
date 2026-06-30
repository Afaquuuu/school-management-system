import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";
import { AuthGuard } from "@/components/layout/auth-guard";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "School Management System",
  description: "Professional school management platform with role-based access and modular operations.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-GB" className={manrope.variable}>
      <body className="font-sans antialiased">
        <Providers>
          <AuthGuard>{children}</AuthGuard>
        </Providers>
      </body>
    </html>
  );
}