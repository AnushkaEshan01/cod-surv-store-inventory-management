"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { InventoryItem, TransactionType, CameraRelocation } from "@/types";
import {
  subscribeToInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
} from "@/lib/inventory-service";
import {
  subscribeToCameraRelocations,
  subscribeToAnnualTarget,
  calculateProjectStats,
} from "@/lib/relocation-service";
import { useAuth } from "@/lib/auth-context";
import { StatCards } from "@/components/StatCards";
import { InventoryTable } from "@/components/InventoryTable";
import { ProductModal } from "@/components/ProductModal";
import { StockActionModal } from "@/components/StockActionModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { CheckCircle2, AlertCircle, Camera, Tv, ArrowRight, Sparkles } from "lucide-react";

import { AdminRequiredModal } from "@/components/AdminRequiredModal";

export default function InventoryDashboard() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [relocations, setRelocations] = useState<CameraRelocation[]>([]);
  const [annualTarget, setAnnualTarget] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  // Admin access requirement modal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminActionName, setAdminActionName] = useState("perform this action");

  const handleRequestAdminAuth = (action: string) => {
    setAdminActionName(action);
    setIsAdminModalOpen(true);
  };

  // Status Filter State
  const [statusFilter, setStatusFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockActionType, setStockActionType] = useState<TransactionType>("IN");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Subscribe to real-time inventory and relocations
  useEffect(() => {
    setLoading(true);
    const unsubInv = subscribeToInventory(
      (updatedItems) => {
        setItems(updatedItems);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    const unsubRelocs = subscribeToCameraRelocations((relocs) => {
      setRelocations(relocs);
    });

    const unsubTarget = subscribeToAnnualTarget((target) => {
      setAnnualTarget(target);
    });

    return () => {
      unsubInv();
      unsubRelocs();
      unsubTarget();
    };
  }, []);

  const projectStats = useMemo(() => {
    return calculateProjectStats(relocations, annualTarget);
  }, [relocations, annualTarget]);

  // Handlers
  const handleSaveProduct = async (
    itemData: Omit<InventoryItem, "id" | "lastUpdated">,
    editId?: string
  ) => {
    const adminEmail = user?.email || "admin@codsurv.com";
    if (editId) {
      await updateInventoryItem(editId, itemData);
      showToast(`Updated "${itemData.itemName}" successfully!`);
    } else {
      await addInventoryItem(itemData, adminEmail);
      showToast(`Added "${itemData.itemName}" to inventory!`);
    }
  };

  const handleStockActionConfirm = async (
    itemId: string,
    type: TransactionType,
    amount: number,
    notes?: string
  ) => {
    const adminEmail = user?.email || "admin@codsurv.com";
    const res = await adjustStock(itemId, type, amount, adminEmail, notes);
    if (res.success) {
      showToast(
        `Stock ${type === "IN" ? "added" : "deducted"} successfully (${amount} units).`
      );
    }
    return res;
  };

  const handleDeleteConfirm = async (itemId: string) => {
    await deleteInventoryItem(itemId);
    showToast("Product deleted from inventory records.");
  };
  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl glass-modal shadow-lg text-xs font-medium border ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                : "border-rose-200 text-rose-800 dark:border-rose-800 dark:text-rose-300"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Store Inventory
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Real-time stock tracking for CCTV cameras, network devices, and cabling hardware.
          </p>
        </div>
      </div>

      {/* Annual Camera Relocation Project Quick Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-900 text-white dark:bg-zinc-900 border border-zinc-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">COD Annual Camera Allocation Project</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {projectStats.progressPercentage}% Complete
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              <strong className="text-emerald-400 font-semibold">{projectStats.totalRelocated}</strong> of {annualTarget} COD cameras relocated • <strong className="text-amber-400 font-semibold">{projectStats.remaining}</strong> remaining • <strong className="text-purple-400 font-semibold">{projectStats.nonQuotaRelocated}</strong> non-quota
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all hover:scale-105"
            title="Launch Fullscreen Office TV Wallboard"
          >
            <Tv className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>TV Wallboard</span>
          </Link>

          <Link
            href="/relocations"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold shadow-xs transition-all"
          >
            <span>View Relocations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <StatCards
        items={items}
        activeStatusFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Main Tabular View */}
      {loading ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent dark:border-white dark:border-t-transparent mb-3" />
          <p className="text-xs text-zinc-500 font-medium">Loading inventory records...</p>
        </div>
      ) : (
        <InventoryTable
          items={items}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          isAdmin={isAdmin}
          onRequestAdminAuth={handleRequestAdminAuth}
          onOpenAddModal={() => {
            setEditingItem(null);
            setIsProductModalOpen(true);
          }}
          onOpenEditModal={(item) => {
            setEditingItem(item);
            setIsProductModalOpen(true);
          }}
          onOpenStockAction={(item, action) => {
            setStockItem(item);
            setStockActionType(action);
            setIsStockModalOpen(true);
          }}
          onOpenDeleteModal={(item) => {
            setDeletingItem(item);
            setIsDeleteModalOpen(true);
          }}
        />
      )}

      {/* Product Add / Edit Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        editItem={editingItem}
      />

      {/* Quick Stock In / Out Modal */}
      <StockActionModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        item={stockItem}
        actionType={stockActionType}
        onConfirm={handleStockActionConfirm}
      />

      {/* Delete Item Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        item={deletingItem}
        onConfirm={handleDeleteConfirm}
      />

      {/* Admin Required Modal */}
      <AdminRequiredModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        actionName={adminActionName}
      />
    </div>
  );
}
