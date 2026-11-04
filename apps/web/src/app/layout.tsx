import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "University Online Examination Network Simulation System",
  description: "Real-time network emulator and NOC operations workbench for university examination infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent-blue/30 selection:text-white flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-border py-4 text-center text-xs text-slate-500 font-mono">
          University Online Examination Network Simulation System • Production Multi-Layer Architecture • Kathará + Docker + OVS + FRRouting
        </footer>
      </body>
    </html>
  );
}

