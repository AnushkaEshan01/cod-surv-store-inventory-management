"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CameraRelocation,
  InventoryItem,
  getStockStatus,
} from "@/types";
import {
  subscribeToCameraRelocations,
  subscribeToAnnualTarget,
  calculateProjectStats,
} from "@/lib/relocation-service";
import { subscribeToInventory } from "@/lib/inventory-service";
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  ArrowLeft,
  Calendar,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

export default function DisplayWallboardPage() {
  const [relocations, setRelocations] = useState<CameraRelocation[]>([]);
  const [annualTarget, setAnnualTarget] = useState<number>(100);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "cameras" | "inventory">("all");

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Subscriptions
  useEffect(() => {
    const unsubRelocs = subscribeToCameraRelocations((items) => {
      setRelocations(items);
    });

    const unsubTarget = subscribeToAnnualTarget((target) => {
      setAnnualTarget(target);
    });

    const unsubInv = subscribeToInventory((items) => {
      setInventoryItems(items);
    });

    // Check fullscreen state changes
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      unsubRelocs();
      unsubTarget();
      unsubInv();
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Project stats
  const stats = useMemo(() => {
    return calculateProjectStats(relocations, annualTarget);
  }, [relocations, annualTarget]);

  // Inventory stats
  const inventoryStats = useMemo(() => {
    const totalItems = inventoryItems.length;
    const totalQuantity = inventoryItems.reduce((acc, it) => acc + it.quantity, 0);
    const lowStockItems = inventoryItems.filter(
      (it) => it.quantity > 0 && it.quantity <= it.lowStockThreshold
    );
    const outOfStockItems = inventoryItems.filter((it) => it.quantity <= 0);
    const inStockItems = inventoryItems.filter((it) => it.quantity > it.lowStockThreshold);

    return {
      totalItems,
      totalQuantity,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      inStockCount: inStockItems.length,
      criticalItems: [...outOfStockItems, ...lowStockItems],
    };
  }, [inventoryItems]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn("Exit fullscreen error:", err);
      });
    }
  };

  // Format date & time nicely for TV screen
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased p-4 sm:p-6 lg:p-8 flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Top Bar / Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        {/* Brand & Mode */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition-all"
            title="Back to Web App"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Store Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-zinc-950 flex items-center justify-center font-bold shadow-lg shadow-white/5">
              <Layers className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">
                  Cod Surv
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Office Wallboard
                </span>
              </div>
              <span className="text-xs text-zinc-400 font-medium">
                Live CCTV Deployment & Inventory Monitor
              </span>
            </div>
          </div>
        </div>

        {/* Live Status & Clock & Fullscreen Toggle */}
        <div className="flex items-center gap-5">
          {/* Live Sync Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">REALTIME SYNC</span>
          </div>

          {/* Large Digital Clock */}
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-white drop-shadow-sm">
              {formattedTime}
            </div>
            <div className="text-[11px] font-medium text-zinc-400">
              {formattedDate}
            </div>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors shadow-sm"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Grid: Left side Camera Relocation, Right side Inventory */}
      <main className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* ================= LEFT SECTION: CAMERA RELOCATION (7 COLS) ================= */}
        <section className="lg:col-span-7 flex flex-col justify-between space-y-6">
          {/* Section Header Card */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Camera className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white">
                    Annual Camera Relocation Project
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Live tracking against the {annualTarget} annual camera quota
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400">
                  {stats.progressPercentage}%
                </span>
                <span className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Target Achieved
                </span>
              </div>
            </div>

            {/* Giant Progress Bar */}
            <div className="space-y-2 mt-4">
              <div className="relative w-full h-5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-zinc-400">
                <span>0 Completed</span>
                <span className="text-emerald-400 font-bold">
                  {stats.totalRelocated} Relocated / Installed
                </span>
                <span>{annualTarget} Total Target</span>
              </div>
            </div>

            {/* Metric KPI Row */}
            <div className="grid grid-cols-3 gap-3.5 mt-6 pt-5 border-t border-zinc-800/60">
              {/* Relocated */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Relocated</span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {stats.totalRelocated}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                  Completed & Active
                </div>
              </div>

              {/* Remaining */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Remaining</span>
                </div>
                <div className="text-3xl font-extrabold text-amber-400 tracking-tight">
                  {stats.remaining}
                </div>
                <div className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                  Cameras to deploy
                </div>
              </div>

              {/* Sites Deployed */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>Deploy Sites</span>
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight">
                  {stats.totalSites}
                </div>
                <div className="text-[10px] text-blue-400 font-semibold mt-0.5">
                  Locations covered
                </div>
              </div>
            </div>
          </div>

          {/* Recent Relocations Live Feed */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Recent Relocation Feed</span>
              </h3>
              <span className="text-xs text-zinc-500 font-medium">
                Live Site Activities
              </span>
            </div>

            {/* Feed Items */}
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1 scrollbar-thin">
              {relocations.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-zinc-950/70 border border-zinc-800/60 hover:border-zinc-700 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-900 text-emerald-400 border border-zinc-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white tracking-tight">
                        {item.siteName}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                        <span>{item.cameraModel || "CCTV Camera"}</span>
                        <span>•</span>
                        <span className="text-zinc-500">{item.technicianName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-400">
                      +{item.cameraCount} <span className="text-[11px] font-normal text-zinc-400">cams</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {item.relocationDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Auto-updating via Google Cloud Firestore</span>
              <span className="text-emerald-400 font-medium">● Connected</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT SECTION: STORE INVENTORY STOCK (5 COLS) ================= */}
        <section className="lg:col-span-5 flex flex-col justify-between space-y-6">
          {/* Inventory Summary Header Card */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Boxes className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-white">
                    Store Inventory Stock
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Warehouse & shop equipment levels
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white">
                  {inventoryStats.totalQuantity}
                </span>
                <span className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  Total Units
                </span>
              </div>
            </div>

            {/* Quick Status Pill Counters */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {/* In Stock */}
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/50 text-center">
                <span className="text-xl font-extrabold text-emerald-400">
                  {inventoryStats.inStockCount}
                </span>
                <span className="block text-[10px] font-semibold text-zinc-400 uppercase mt-0.5">
                  Optimal
                </span>
              </div>

              {/* Low Stock */}
              <div className={`p-3 rounded-2xl border text-center ${
                inventoryStats.lowStockCount > 0
                  ? "bg-amber-950/30 border-amber-800/50 text-amber-400"
                  : "bg-zinc-950/60 border-zinc-800/50 text-zinc-500"
              }`}>
                <span className="text-xl font-extrabold">
                  {inventoryStats.lowStockCount}
                </span>
                <span className="block text-[10px] font-semibold uppercase mt-0.5">
                  Low Stock
                </span>
              </div>

              {/* Out of Stock */}
              <div className={`p-3 rounded-2xl border text-center ${
                inventoryStats.outOfStockCount > 0
                  ? "bg-rose-950/30 border-rose-800/50 text-rose-400 animate-pulse"
                  : "bg-zinc-950/60 border-zinc-800/50 text-zinc-500"
              }`}>
                <span className="text-xl font-extrabold">
                  {inventoryStats.outOfStockCount}
                </span>
                <span className="block text-[10px] font-semibold uppercase mt-0.5">
                  Out of Stock
                </span>
              </div>
            </div>
          </div>

          {/* Live Inventory Items Monitor */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-400" />
                <span>Live Stock Levels</span>
              </h3>
              <span className="text-xs text-zinc-500">
                {inventoryItems.length} Products
              </span>
            </div>

            {/* Items List */}
            <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
              {inventoryItems.map((item) => {
                const status = getStockStatus(item.quantity, item.lowStockThreshold);
                const isOutOfStock = status === "out-of-stock";
                const isLowStock = status === "low-stock";

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isOutOfStock
                        ? "bg-rose-950/20 border-rose-800/40"
                        : isLowStock
                        ? "bg-amber-950/20 border-amber-800/40"
                        : "bg-zinc-950/60 border-zinc-800/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {item.itemName}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>Min: {item.lowStockThreshold} {item.unit || "units"}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <div
                          className={`text-lg font-black tracking-tight ${
                            isOutOfStock
                              ? "text-rose-400"
                              : isLowStock
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {item.quantity}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-medium">
                          {item.unit || "units"}
                        </div>
                      </div>

                      {/* Status indicator dot */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isOutOfStock
                            ? "bg-rose-500 animate-ping"
                            : isLowStock
                            ? "bg-amber-400 animate-pulse"
                            : "bg-emerald-400"
                        }`}
                        title={status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Alert / Info */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Threshold alerts active</span>
              </span>
              <span className="text-[11px] text-zinc-500">
                Press <strong>F11</strong> for Fullscreen TV
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer ticker */}
      <footer className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-2">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Cod Surv Store Surveillance Wallboard</span>
          <span>•</span>
          <span>Designed for Office TV & Wall Displays</span>
        </div>
        <div className="text-[11px] text-zinc-600">
          Auto-updates instantly on stock adjustments or camera relocations.
        </div>
      </footer>
    </div>
  );
}
