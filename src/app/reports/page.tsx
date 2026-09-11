"use client";

import React, { useState, useEffect } from "react";
import { InventoryItem, TransactionLog } from "@/types";
import { subscribeToInventory, subscribeToTransactions } from "@/lib/inventory-service";
import { useAuth } from "@/lib/auth-context";
import {
  exportWeeklyReportToPDF,
  exportInventoryToCSV,
  exportTransactionsToCSV,
} from "@/lib/export-utils";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
} from "lucide-react";

export default function ReportsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubItems = subscribeToInventory((updatedItems) => {
      setItems(updatedItems);
    });
    const unsubLogs = subscribeToTransactions((updatedLogs) => {
      setLogs(updatedLogs);
      setLoading(false);
    });

    return () => {
      unsubItems();
      unsubLogs();
    };
  }, []);

  // Summary Metrics
  const totalItems = items.length;
  const totalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const inStockItems = items.filter((it) => it.quantity > it.lowStockThreshold);
  const lowStockItems = items.filter(
    (it) => it.quantity > 0 && it.quantity <= it.lowStockThreshold
  );
  const outOfStockItems = items.filter((it) => it.quantity === 0);

  // Group by category
  const categorySummary = items.reduce<Record<string, { count: number; totalUnits: number }>>(
    (acc, it) => {
      if (!acc[it.category]) {
        acc[it.category] = { count: 0, totalUnits: 0 };
      }
      acc[it.category].count += 1;
      acc[it.category].totalUnits += it.quantity;
      return acc;
    },
    {}
  );

  const adminEmail = user?.email || "viewer@codsurv.com";

  return (
    <div className="py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Inventory Reports & Export
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              Weekly & Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
            Client-side generated PDF and CSV executive reports with zero server compute.
          </p>
        </div>

        {/* Quick Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportWeeklyReportToPDF(items, logs, adminEmail)}
            disabled={loading || items.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Weekly PDF</span>
          </button>

          <button
            onClick={() => exportInventoryToCSV(items)}
            disabled={loading || items.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white/70 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Stock CSV</span>
          </button>
        </div>
      </div>

      {/* Stock Health Progress Bars */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Inventory Health Distribution
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Current stock availability across {totalItems} catalog items
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Updated Just Now</span>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex mb-4">
          <div
            style={{ width: `${totalItems ? (inStockItems.length / totalItems) * 100 : 0}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`Healthy Stock: ${inStockItems.length}`}
          />
          <div
            style={{ width: `${totalItems ? (lowStockItems.length / totalItems) * 100 : 0}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Low Stock: ${lowStockItems.length}`}
          />
          <div
            style={{ width: `${totalItems ? (outOfStockItems.length / totalItems) * 100 : 0}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
            title={`Out of Stock: ${outOfStockItems.length}`}
          />
        </div>

        {/* Legend Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-950 dark:text-emerald-200">
                In Stock (Healthy)
              </span>
            </div>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {inStockItems.length} items (
              {totalItems ? Math.round((inStockItems.length / totalItems) * 100) : 0}%)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-950 dark:text-amber-200">
                Low Stock Threshold
              </span>
            </div>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
              {lowStockItems.length} items (
              {totalItems ? Math.round((lowStockItems.length / totalItems) * 100) : 0}%)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-medium text-rose-950 dark:text-rose-200">
                Out of Stock
              </span>
            </div>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">
              {outOfStockItems.length} items (
              {totalItems ? Math.round((outOfStockItems.length / totalItems) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Category Distribution
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Stock allocation by hardware equipment group
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-200/40 dark:border-zinc-800/40 text-zinc-500 font-medium">
                <th className="py-2.5 px-3">Hardware Category</th>
                <th className="py-2.5 px-3 text-right">Unique Items</th>
                <th className="py-2.5 px-3 text-right">Total Units</th>
                <th className="py-2.5 px-3 text-right">Share of Inventory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 font-normal">
              {Object.entries(categorySummary).map(([catName, data]) => {
                const sharePercent = totalUnits
                  ? Math.round((data.totalUnits / totalUnits) * 100)
                  : 0;
                return (
                  <tr key={catName} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                    <td className="py-3 px-3 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Boxes className="w-3.5 h-3.5 text-zinc-400" />
                      {catName}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-600 dark:text-zinc-400">
                      {data.count} items
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-zinc-900 dark:text-white">
                      {data.totalUnits} units
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-500">
                      <div className="flex items-center justify-end gap-2">
                        <span>{sharePercent}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            style={{ width: `${sharePercent}%` }}
                            className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Export Preview Card */}
      <div className="glass-card rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Weekly Printable Audit & Stock PDF
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Includes comprehensive product table, threshold alerts, and last 10 audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={() => exportWeeklyReportToPDF(items, logs, adminEmail)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF Report</span>
        </button>
      </div>
    </div>
  );
}
