"use client";

import React, { useState, useEffect } from "react";
import { InventoryItem, ItemCategory } from "@/types";
import { X, Plus, Check } from "lucide-react";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<InventoryItem, "id" | "lastUpdated">, editId?: string) => Promise<void>;
  editItem?: InventoryItem | null;
}

const CATEGORIES: ItemCategory[] = [
  "CCTV Cameras",
  "Network Devices",
  "Cables & Wiring",
  "Power & Accessories",
  "Storage & Hard Drives",
  "Hardware & Tools",
  "Other",
];

export function ProductModal({ isOpen, onClose, onSave, editItem }: ProductModalProps) {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<string>("CCTV Cameras");
  const [quantity, setQuantity] = useState<number | string>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(5);
  const [unit, setUnit] = useState("pcs");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (editItem) {
      setItemName(editItem.itemName);
      setCategory(editItem.category);
      setQuantity(editItem.quantity);
      setLowStockThreshold(editItem.lowStockThreshold);
      setUnit(editItem.unit || "pcs");
      setDescription(editItem.description || "");
    } else {
      setItemName("");
      setCategory("CCTV Cameras");
      setQuantity(0);
      setLowStockThreshold(5);
      setUnit("pcs");
      setDescription("");
    }
    setErrorMessage("");
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setErrorMessage("Please enter an item name.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      await onSave(
        {
          itemName: itemName.trim(),
          category,
          quantity: Number(quantity) || 0,
          lowStockThreshold: Number(lowStockThreshold) || 5,
          unit: unit.trim() || "pcs",
          description: description.trim(),
        },
        editItem?.id
      );
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 border border-white/40 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200/50 dark:border-zinc-800/60">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {editItem ? "Edit Inventory Item" : "Add New Item"}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              {editItem
                ? "Update product details and stock threshold"
                : "Register a new hardware item in the store inventory"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Item Name & Model *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hikvision 4MP IP Dome Camera DS-2CD1143G0-I"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
            />
          </div>

          {/* Category & Unit Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                placeholder="pcs, rolls, units, meters"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>
          </div>

          {/* Initial Quantity & Low Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                {editItem ? "Current Quantity *" : "Initial Stock Quantity *"}
              </label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Low Stock Warning Threshold *
              </label>
              <input
                type="number"
                min="1"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all"
              />
              <span className="text-[10px] text-zinc-600 dark:text-zinc-300 mt-1 block">
                Triggers warning when stock drops to or below this.
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description / Specs (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Model specifications, brand, location, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                "Saving..."
              ) : editItem ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add to Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
