"use client";

import React, { useState } from "react";
import { InventoryItem, TransactionType } from "@/types";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface StockActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  actionType: TransactionType;
  onConfirm: (
    itemId: string,
    type: TransactionType,
    amount: number,
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

export function StockActionModal({
  isOpen,
  onClose,
  item,
  actionType,
  onConfirm,
}: StockActionModalProps) {
  const [amount, setAmount] = useState<number | string>(1);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !item) return null;

  const isAdd = actionType === "IN";
  const numAmount = amount === "" ? 0 : Number(amount) || 0;
  const projectedQuantity = isAdd ? item.quantity + numAmount : item.quantity - numAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!amount || isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMessage("Please enter a quantity greater than 0.");
      return;
    }

    if (!isAdd && finalAmount > item.quantity) {
      setErrorMessage(`Cannot deduct ${finalAmount}. Current stock is only ${item.quantity}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const res = await onConfirm(item.id, actionType, finalAmount, notes.trim());
      if (res.success) {
        onClose();
        setAmount(1);
        setNotes("");
      } else {
        setErrorMessage(res.error || "Failed to adjust stock.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error executing stock adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden shadow-2xl p-6 border border-white/40 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/50 dark:border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isAdd
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
              }`}
            >
              {isAdd ? (
                <ArrowDownLeft className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {isAdd ? "Stock In (Add Items)" : "Stock Out (Deduct Items)"}
              </h2>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                Audit logged transaction
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Summary Card */}
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {item.itemName}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
            <span>Category: {item.category}</span>
            <span>
              Current: <strong className="text-zinc-900 dark:text-white">{item.quantity}</strong>{" "}
              {item.unit || "units"}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3.5 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Quantity to {isAdd ? "Add" : "Deduct"} ({item.unit || "units"}) *
            </label>
            <input
              type="number"
              min="1"
              max={isAdd ? undefined : item.quantity}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-lg font-semibold bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all text-center"
            />
          </div>

          {/* Quick preset pills */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 5, 10, 20].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => setAmount(num)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  Number(amount) === num
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent"
                    : "bg-white/60 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                +{num}
              </button>
            ))}
          </div>

          {/* Projected Stock Preview */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 text-xs border border-zinc-200/40 dark:border-zinc-800/40">
            <span className="text-zinc-600 dark:text-zinc-300">New Resulting Stock:</span>
            <span
              className={`font-semibold ${
                projectedQuantity === 0
                  ? "text-rose-600 dark:text-rose-400"
                  : projectedQuantity <= item.lowStockThreshold
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {projectedQuantity} {item.unit || "units"}
            </span>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Reason / Reference (e.g. Invoice #, Project Name, Defect return)
            </label>
            <input
              type="text"
              placeholder={isAdd ? "Supplier purchase order #104..." : "Client installation at Site B..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || (!isAdd && item.quantity < numAmount)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-medium shadow-sm transition-all disabled:opacity-50 ${
                isAdd
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              {isSubmitting ? "Updating..." : isAdd ? "Add Stock" : "Deduct Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
