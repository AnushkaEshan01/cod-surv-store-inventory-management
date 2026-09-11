"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const res = await login(email, password);
      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Invalid administrator credentials.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@codsurv.com");
    setPassword("admin123");
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Apple-style Centered Auth Card */}
        <div className="glass-modal rounded-3xl p-8 sm:p-9 shadow-2xl border border-white/50 dark:border-white/10">
          {/* Logo & Title */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Cod Surv Inventory
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                Authorized Administrator Access Only
              </p>
            </div>
          </div>

          {/* Demo Sandbox Alert */}
          {isDemo && (
            <div className="mb-6 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs">
              <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200 mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Demo Mode Active
                </span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 underline font-normal hover:text-amber-900"
                >
                  <Sparkles className="w-3 h-3" /> Auto-fill
                </button>
              </div>
              <div className="text-amber-700/90 dark:text-amber-300/80 text-[11px] leading-relaxed">
                Connect Firebase in <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono">.env.local</code> for production authentication.
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@codsurv.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                "Verifying..."
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Setup / Seeder Link */}
          <div className="mt-6 pt-5 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center">
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Setting up this Firebase project for the first time?
            </p>
            <button
              type="button"
              onClick={() => router.push("/setup")}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Initialize Admin & Database in Firebase →</span>
            </button>
          </div>
        </div>

        {/* Minimal Footer Note */}
        <p className="text-center text-[11px] text-zinc-600 dark:text-zinc-300 mt-6">
          Cod Surv Store Management System • Single Administrator Architecture
        </p>
      </div>
    </div>
  );
}
