"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDisplayPage = pathname === "/display" || pathname.startsWith("/display");

  if (isDisplayPage) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 text-white m-0 p-0 overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      {/* Top Subtle Ambient Lighting */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-blue-50/60 via-zinc-50/30 to-transparent dark:from-blue-950/20 dark:via-zinc-900/10 dark:to-transparent blur-3xl opacity-70" />
      </div>

      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="w-full py-6 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center text-xs text-zinc-600 dark:text-zinc-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Cod Surv Store. All rights reserved.</span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
            Designed with Apple Minimalist Aesthetics • Next.js & Tailwind CSS
          </span>
        </div>
      </footer>
    </div>
  );
}
