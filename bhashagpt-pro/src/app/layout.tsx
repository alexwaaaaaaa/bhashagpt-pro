import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/app-providers";
import Navbar from "@/components/layout/navbar";
import BottomNav from "@/components/layout/bottom-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BhashaGPT Pro - AI Language Learning Platform",
  description: "Learn any language with AI-powered conversations, voice interactions, and personalized tutoring",
  keywords: "language learning, AI tutor, multilingual, conversation practice, voice chat",
  authors: [{ name: "BhashaGPT Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#111827" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-900 text-white`}>
        <AppProviders>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pb-16 md:pb-0">
              {children}
            </main>
            <BottomNav />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
