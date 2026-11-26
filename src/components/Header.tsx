"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  ShieldAlert,
  Boxes,
  ClipboardList,
  FileBarChart2,
  LogOut,
  Radio,
  Layers,
  Eye,
  Lock,
  Camera,
  Tv,
} from "lucide-react";

export function Header() {
  const pathname = usePathname();
  const { user, logout, isDemo } = useAuth();

  const navLinks = [
    { href: "/", label: "Inventory", icon: Boxes },
    { href: "/relocations", label: "Camera Relocations", icon: Camera },
    { href: "/transactions", label: "Audit Log", icon: ClipboardList },
    { href: "/reports", label: "Reports", icon: FileBarChart2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight text-base">
                    Cod Surv
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                    Store
                  </span>
                </div>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                  CCTV & Hardware Inventory
                </span>
              </div>
            </Link>

            {/* Navigation Pills (Desktop) */}
            <nav className="hidden md:flex items-center gap-1.5 ml-4 p-1 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/60">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all duration-150 ${
                      isActive
                        ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold"
                        : "text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 stroke-[2]" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Actions & Status */}
          <div className="flex items-center gap-2.5">
            {/* TV Wallboard Display Mode Button */}
            <Link
              href="/display"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shadow-xs hover:opacity-90 active:scale-95 transition-all"
              title="Launch Fullscreen Office Monitor / TV Live Wallboard"
            >
              <Tv className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 animate-pulse" />
              <span>TV Display</span>
            </Link>

            {/* Status Indicator Pill */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                isDemo
                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40"
                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40"
              }`}
              title={
                isDemo
                  ? "Running in sandbox/local preview mode. Connect Firebase in .env.local for live Firestore sync."
                  : "Connected to Google Firebase Cloud Firestore"
              }
            >
              <Radio className={`w-3 h-3 ${isDemo ? "text-amber-500 animate-pulse" : "text-emerald-500"}`} />
              <span>{isDemo ? "Demo Sandbox" : "Firestore Live"}</span>
            </div>

            {/* Admin User Info & Logout */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200/60 dark:border-zinc-800/60">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                    {user.email}
                  </span>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-300">
                    Administrator
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign out of Admin session"
                  className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                >
                  <LogOut className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                  <Eye className="w-3 h-3 text-zinc-400" />
                  <span>Read-Only</span>
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
                >
                  <Lock className="w-3 h-3" />
                  <span>Admin Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg ${
                  isActive
                    ? "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-950 dark:text-white font-semibold"
                    : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
