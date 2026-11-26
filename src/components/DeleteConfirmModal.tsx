"use client";

import React, { useState } from "react";
import { InventoryItem } from "@/types";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  itemName?: string;
  onConfirm: (itemId: string) => Promise<void>;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  item,
  itemName,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;
  const displayName = itemName || item?.itemName || "this item";

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(item?.id || "");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 dark:bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm glass-modal rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Confirm Deletion
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">{displayName}</strong>? This
            will permanently remove it from records.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Deleting..." : "Delete Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
