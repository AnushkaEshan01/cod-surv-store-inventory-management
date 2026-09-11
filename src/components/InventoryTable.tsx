"use client";

import React, { useState, useMemo } from "react";
import { InventoryItem, ItemCategory, getStockStatus } from "@/types";
import {
  Search,
  Plus,
  Minus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  AlertCircle,
  Package,
  Lock,
  Info,
} from "lucide-react";
import { exportInventoryToCSV } from "@/lib/export-utils";

interface InventoryTableProps {
  items: InventoryItem[];
  onOpenAddModal: () => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenStockAction: (item: InventoryItem, action: "IN" | "OUT") => void;
  onOpenDeleteModal: (item: InventoryItem) => void;
  statusFilter: "all" | "in-stock" | "low-stock" | "out-of-stock";
  onStatusFilterChange: (status: "all" | "in-stock" | "low-stock" | "out-of-stock") => void;
  isAdmin?: boolean;
  onRequestAdminAuth?: (action: string) => void;
}

const CATEGORIES: ("All" | ItemCategory)[] = [
  "All",
  "CCTV Cameras",
  "Network Devices",
  "Cables & Wiring",
  "Power & Accessories",
  "Storage & Hard Drives",
  "Hardware & Tools",
];

export function InventoryTable({
  items,
  onOpenAddModal,
  onOpenEditModal,
  onOpenStockAction,
  onOpenDeleteModal,
  statusFilter,
  onStatusFilterChange,
  isAdmin = false,
  onRequestAdminAuth,
}: InventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortField, setSortField] = useState<"itemName" | "quantity" | "category" | "lastUpdated">("itemName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleAddClick = () => {
    if (!isAdmin) {
      onRequestAdminAuth?.("add new inventory items");
    } else {
      onOpenAddModal();
    }
  };

  const handleStockClick = (item: InventoryItem, action: "IN" | "OUT") => {
    if (!isAdmin) {
      onRequestAdminAuth?.("adjust stock levels");
    } else {
      onOpenStockAction(item, action);
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    if (!isAdmin) {
      onRequestAdminAuth?.("modify item details");
    } else {
      onOpenEditModal(item);
    }
  };

  const handleDeleteClick = (item: InventoryItem) => {
    if (!isAdmin) {
      onRequestAdminAuth?.("delete products");
    } else {
      onOpenDeleteModal(item);
    }
  };

  // Filtering and Sorting
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          item.itemName.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query));

        // Category filter
        const matchesCategory =
          selectedCategory === "All" || item.category === selectedCategory;

        // Status filter
        const status = getStockStatus(item.quantity, item.lowStockThreshold);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "in-stock" && status === "in-stock") ||
          (statusFilter === "low-stock" && status === "low-stock") ||
          (statusFilter === "out-of-stock" && status === "out-of-stock");

        return matchesQuery && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "itemName") {
          comp = a.itemName.localeCompare(b.itemName);
        } else if (sortField === "category") {
          comp = a.category.localeCompare(b.category);
        } else if (sortField === "quantity") {
          comp = a.quantity - b.quantity;
        } else if (sortField === "lastUpdated") {
          comp = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        }
        return sortOrder === "asc" ? comp : -comp;
      });
  }, [items, searchQuery, selectedCategory, statusFilter, sortField, sortOrder]);

  const handleSort = (field: "itemName" | "quantity" | "category" | "lastUpdated") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="glass-card rounded-3xl overflow-hidden transition-all">
      {/* Read-Only Notice Banner for Guests */}
      {!isAdmin && (
        <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 p-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> You can view all real-time stock levels, search, and download reports. Sign in as Admin to add items or make stock changes.
            </span>
          </div>
          <button
            onClick={() => onRequestAdminAuth?.("manage inventory")}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xs hover:opacity-90 transition-opacity shrink-0"
          >
            <Lock className="w-3 h-3" />
            <span>Admin Sign In</span>
          </button>
        </div>
      )}

      {/* Top Filter & Action Bar */}
      <div className="p-4 sm:p-6 border-b border-zinc-200/50 dark:border-zinc-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search CCTV, NVRs, cables, routers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportInventoryToCSV(filteredItems)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-white/60 dark:bg-zinc-800/60 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs transition-all"
              title="Download filtered items to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handleAddClick}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm active:scale-[0.98] transition-all"
              title={isAdmin ? "Add new inventory item" : "Admin sign in required to add items"}
            >
              {isAdmin ? (
                <Plus className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Status Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1 pl-1 pr-2">
            <SlidersHorizontal className="w-3 h-3" />
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition-all duration-150 font-medium ${
                selectedCategory === cat
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-2xs"
                  : "bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 font-medium">
              <th
                onClick={() => handleSort("itemName")}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product Name</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("category")}
                className="py-3 px-4 hidden md:table-cell cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort("quantity")}
                className="py-3 px-4 text-right cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Stock Quantity</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Quick Stock</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 font-normal">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Package className="w-8 h-8 stroke-[1.2] text-zinc-400" />
                    <p className="text-sm font-medium">No inventory items match your criteria</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                        onStatusFilterChange("all");
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const status = getStockStatus(item.quantity, item.lowStockThreshold);
                const isOutOfStock = status === "out-of-stock";
                const isLowStock = status === "low-stock";

                // Dynamic row tinting matching PRD §3.4:
                // Low stock: highlight row/text in orange/yellow
                // Out of stock: highlight row in red and explicitly display "Out of Stock"
                const rowHighlight = isOutOfStock
                  ? "bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70 dark:hover:bg-rose-950/30"
                  : isLowStock
                  ? "bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60 dark:hover:bg-amber-950/25"
                  : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30";

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors duration-150 ${rowHighlight}`}
                  >
                    {/* Item Name */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {item.itemName}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-1 mt-0.5">
                        {item.description || (
                          <span className="italic">Min alert: {item.lowStockThreshold} {item.unit || "units"}</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-zinc-600 dark:text-zinc-300">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-semibold tracking-tight text-base ${
                          isOutOfStock
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : isLowStock
                            ? "text-amber-600 dark:text-amber-400 font-bold"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 ml-1">
                        {item.unit || "units"}
                      </span>
                    </td>

                    {/* Dynamic Status Indicator */}
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                          <AlertCircle className="w-3 h-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          In Stock
                        </span>
                      )}
                    </td>

                    {/* Quick Stock Action Buttons (+ / -) */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50">
                        <button
                          onClick={() => handleStockClick(item, "IN")}
                          title={isAdmin ? `Add stock to ${item.itemName}` : "Admin sign-in required"}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>In</span>
                        </button>
                        <button
                          onClick={() => handleStockClick(item, "OUT")}
                          disabled={isAdmin && item.quantity <= 0}
                          title={isAdmin ? `Deduct stock from ${item.itemName}` : "Admin sign-in required"}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Out</span>
                        </button>
                      </div>
                    </td>

                    {/* Edit & Delete Actions */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(item)}
                          title={isAdmin ? "Edit product details" : "Admin sign-in required"}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          title={isAdmin ? "Delete product" : "Admin sign-in required"}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="py-3 px-4 sm:px-6 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Showing {filteredItems.length} of {items.length} items
        </span>
        <span className="hidden sm:inline">
          Real-time snapshot listener active
        </span>
      </div>
    </div>
  );
}
