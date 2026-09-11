"use client";

import React, { useState, useEffect } from "react";
import { InventoryItem, TransactionType } from "@/types";
import {
  subscribeToInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
} from "@/lib/inventory-service";
import { useAuth } from "@/lib/auth-context";
import { StatCards } from "@/components/StatCards";
import { InventoryTable } from "@/components/InventoryTable";
import { ProductModal } from "@/components/ProductModal";
import { StockActionModal } from "@/components/StockActionModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { AdminRequiredModal } from "@/components/AdminRequiredModal";

export default function InventoryDashboard() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
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

  // Subscribe to real-time inventory updates
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToInventory(
      (updatedItems) => {
        setItems(updatedItems);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

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
