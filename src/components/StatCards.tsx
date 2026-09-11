"use client";

import React from "react";
import { InventoryItem } from "@/types";
import { Boxes, PackageCheck, AlertTriangle, XCircle } from "lucide-react";

interface StatCardsProps {
  items: InventoryItem[];
  onFilterChange?: (status: "all" | "in-stock" | "low-stock" | "out-of-stock") => void;
  activeStatusFilter?: string;
}

export function StatCards({ items, onFilterChange, activeStatusFilter = "all" }: StatCardsProps) {
  const totalItems = items.length;
  const totalUnits = items.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const lowStockItems = items.filter(
    (item) => item.quantity > 0 && item.quantity <= item.lowStockThreshold
  );
  const outOfStockItems = items.filter((item) => item.quantity === 0);

  const stats = [
    {
      id: "all",
      label: "Total Products",
      value: totalItems,
      unit: "Catalog SKUs",
      icon: Boxes,
      iconColor: "text-zinc-700 dark:text-zinc-300",
      bgColor: "bg-zinc-100/80 dark:bg-zinc-800/60",
      activeRing: "ring-2 ring-zinc-400 dark:ring-zinc-600",
    },
    {
      id: "in-stock",
      label: "Stock Units",
      value: totalUnits,
      unit: "Total in store",
      icon: PackageCheck,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50/80 dark:bg-emerald-950/40",
      activeRing: "ring-2 ring-emerald-500",
    },
    {
      id: "low-stock",
      label: "Low Stock Alert",
      value: lowStockItems.length,
      unit: "Below threshold",
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50/80 dark:bg-amber-950/40",
      warning: lowStockItems.length > 0,
      activeRing: "ring-2 ring-amber-500",
    },
    {
      id: "out-of-stock",
      label: "Out of Stock",
      value: outOfStockItems.length,
      unit: "Needs immediate restock",
      icon: XCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50/80 dark:bg-rose-950/40",
      danger: outOfStockItems.length > 0,
      activeRing: "ring-2 ring-rose-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isActive = activeStatusFilter === stat.id;
        return (
          <button
            key={stat.id}
            onClick={() => onFilterChange && onFilterChange(stat.id as "all" | "in-stock" | "low-stock" | "out-of-stock")}
            className={`text-left p-4 sm:p-5 rounded-2xl glass-card transition-all duration-200 hover:translate-y-[-2px] hover:shadow-md ${
              isActive ? stat.activeRing : ""
            } group`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </span>
              <div className={`p-2 rounded-xl ${stat.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${stat.iconColor} stroke-[2]`} />
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {stat.value.toLocaleString()}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300">
                {stat.unit}
              </span>
              {stat.danger && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                  Critical
                </span>
              )}
              {stat.warning && !stat.danger && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Action
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
