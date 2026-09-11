"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, X, ShieldAlert, ArrowRight } from "lucide-react";

interface AdminRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionName?: string;
}

export function AdminRequiredModal({
  isOpen,
  onClose,
  actionName = "perform this action",
}: AdminRequiredModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/70 backdrop-blur-md transition-opacity">
      <div className="relative w-full max-w-sm glass-modal rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/50 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shadow-md">
            <Lock className="w-5 h-5 stroke-[2.2]" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-semibold text-zinc-950 dark:text-white tracking-tight">
            Administrator Access Required
          </h3>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            You are currently in <strong>Read-Only Mode</strong>. To {actionName}, please sign in
            with your administrator credentials.
          </p>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Strict admin authentication protects store records.</span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/login");
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm transition-all"
          >
            <span>Sign In as Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
