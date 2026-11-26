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
  Settings,
  Star,
  Check,
  X,
  Search,
  Filter,
  ShieldCheck,
  Building2,
} from "lucide-react";

const TV_SELECTED_ITEMS_KEY = "cod_surv_tv_selected_items";

export default function DisplayWallboardPage() {
  const [relocations, setRelocations] = useState<CameraRelocation[]>([]);
  const [annualTarget, setAnnualTarget] = useState<number>(100);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // TV View Mode: "selected" | "low-stock" | "all"
  const [viewFilter, setViewFilter] = useState<"selected" | "low-stock" | "all">("selected");

  // Selected item IDs for TV display
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configSearch, setConfigSearch] = useState("");

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved selected items from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TV_SELECTED_ITEMS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedItemIds(parsed);
            return;
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // When inventory items load, set sensible defaults if none selected
  useEffect(() => {
    if (inventoryItems.length > 0 && selectedItemIds.length === 0) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(TV_SELECTED_ITEMS_KEY);
        if (!saved) {
          // Default selection: CCTV Cameras, Storage, Switches, Cables
          const defaultItems = inventoryItems.filter(
            (it) =>
              it.category === "CCTV Cameras" ||
              it.category === "Storage & Hard Drives" ||
              it.category === "Network Devices" ||
              it.category === "Cables & Wiring"
          );
          const defaultIds = defaultItems.slice(0, 8).map((it) => it.id);
          setSelectedItemIds(defaultIds);
          localStorage.setItem(TV_SELECTED_ITEMS_KEY, JSON.stringify(defaultIds));
        }
      }
    }
  }, [inventoryItems, selectedItemIds.length]);

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

  // Save selected items to localStorage
  const handleTogglePinItem = (id: string) => {
    setSelectedItemIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(TV_SELECTED_ITEMS_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    const allIds = inventoryItems.map((it) => it.id);
    setSelectedItemIds(allIds);
    localStorage.setItem(TV_SELECTED_ITEMS_KEY, JSON.stringify(allIds));
  };

  const handleClearAll = () => {
    setSelectedItemIds([]);
    localStorage.setItem(TV_SELECTED_ITEMS_KEY, JSON.stringify([]));
  };

  const handleSelectCamerasOnly = () => {
    const cameraIds = inventoryItems
      .filter((it) => it.category === "CCTV Cameras" || it.itemName.toLowerCase().includes("camera"))
      .map((it) => it.id);
    setSelectedItemIds(cameraIds);
    localStorage.setItem(TV_SELECTED_ITEMS_KEY, JSON.stringify(cameraIds));
  };

  // Stats calculation
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
    };
  }, [inventoryItems]);

  // Filtered products for TV display
  const displayedProducts = useMemo(() => {
    if (viewFilter === "low-stock") {
      return inventoryItems.filter((it) => it.quantity <= it.lowStockThreshold);
    }
    if (viewFilter === "selected") {
      if (selectedItemIds.length === 0) {
        return inventoryItems.slice(0, 10);
      }
      return inventoryItems.filter((it) => selectedItemIds.includes(it.id));
    }
    return inventoryItems;
  }, [inventoryItems, viewFilter, selectedItemIds]);

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
                COD Camera Relocations & Live Inventory Monitor
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

      {/* Main Content Grid: Left side COD Relocations, Right side Inventory */}
      <main className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* ================= LEFT SECTION: COD CAMERA RELOCATION (6 COLS) ================= */}
        <section className="lg:col-span-6 flex flex-col justify-between space-y-6">
          {/* Main COD Relocations Command Card */}
          <div className="p-7 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl relative overflow-hidden flex flex-col justify-between flex-1">
            {/* Header with COD Contractor Tag */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>COD Third-Party Contractor Project</span>
                </div>
                <span className="text-xs font-bold text-zinc-400">
                  Annual 100 Camera Contract
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                COD Camera Relocation Status
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Tracking annual camera quota allocated to COD operations
              </p>
            </div>

            {/* Giant Circular Progress & Big Milestone Number */}
            <div className="my-6 p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/60 flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Left: Giant Completed Numbers */}
              <div className="text-center sm:text-left space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Cameras Relocated So Far
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-6xl sm:text-7xl font-black tracking-tight text-emerald-400">
                    {stats.totalRelocated}
                  </span>
                  <span className="text-2xl font-bold text-zinc-500">
                    / {annualTarget}
                  </span>
                </div>
                <p className="text-xs font-medium text-emerald-400/90 flex items-center justify-center sm:justify-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>62 Completed out of 100 Target</span>
                </p>
              </div>

              {/* Right: Remaining Box */}
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center min-w-[150px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Remaining
                </span>
                <span className="text-4xl font-extrabold text-amber-400 tracking-tight">
                  {stats.remaining}
                </span>
                <span className="block text-[11px] text-zinc-400 font-medium mt-1">
                  Cameras to Relocate
                </span>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-zinc-400">Contract Completion:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {stats.progressPercentage}% Target Achieved
                </span>
              </div>
              <div className="relative w-full h-5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-zinc-500 pt-1">
                <span>0 Completed</span>
                <span>25 (Quarter)</span>
                <span>50 (Halfway)</span>
                <span className="text-emerald-400 font-bold">62 (Current)</span>
                <span>{annualTarget} Target</span>
              </div>
            </div>

            {/* Contract Overview Cards */}
            <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-zinc-800/60">
              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Target Client</span>
                </div>
                <div className="text-base font-bold text-white">
                  COD Corporation
                </div>
                <div className="text-[10px] text-zinc-500 font-medium mt-0.5">
                  Annual Surveillance SLA
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Contractor Team</span>
                </div>
                <div className="text-base font-bold text-white">
                  Cod Surv Store
                </div>
                <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  Third-Party Installation
                </div>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span>Only COD Relocations tracked here</span>
              <span className="text-emerald-400 font-medium">● 62 Done / 38 Left</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT SECTION: STORE INVENTORY STOCK (6 COLS) ================= */}
        <section className="lg:col-span-6 flex flex-col justify-between space-y-6">
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
                    Warehouse equipment & stock overview
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
              <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/50 text-center">
                <span className="text-xl font-extrabold text-emerald-400">
                  {inventoryStats.inStockCount}
                </span>
                <span className="block text-[10px] font-semibold text-zinc-400 uppercase mt-0.5">
                  Optimal
                </span>
              </div>

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

          {/* Live Inventory Items Monitor with User Customization */}
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800/80 shadow-2xl flex-1 flex flex-col justify-between">
            {/* Controls Row: View Tabs & Customize Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs">
                <button
                  onClick={() => setViewFilter("selected")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    viewFilter === "selected"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>My Selected ({selectedItemIds.length})</span>
                </button>

                <button
                  onClick={() => setViewFilter("low-stock")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewFilter === "low-stock"
                      ? "bg-amber-500 text-zinc-950 shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Low Stock Only</span>
                </button>

                <button
                  onClick={() => setViewFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewFilter === "all"
                      ? "bg-white text-zinc-950 shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>All ({inventoryItems.length})</span>
                </button>
              </div>

              {/* Configure TV Products Button */}
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 transition-all hover:scale-105 shadow-xs"
                title="Select which products appear on the TV display"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                <span>Select TV Items</span>
              </button>
            </div>

            {/* Items List */}
            {displayedProducts.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs">No products to display in this view.</p>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-xs text-blue-400 underline font-medium"
                >
                  Click here to select products for your TV Wallboard
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1 scrollbar-thin">
                {displayedProducts.map((item) => {
                  const status = getStockStatus(item.quantity, item.lowStockThreshold);
                  const isOutOfStock = status === "out-of-stock";
                  const isLowStock = status === "low-stock";
                  const isPinned = selectedItemIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isOutOfStock
                          ? "bg-rose-950/20 border-rose-800/40"
                          : isLowStock
                          ? "bg-amber-950/20 border-amber-800/40"
                          : "bg-zinc-950/60 border-zinc-800/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePinItem(item.id)}
                            title={isPinned ? "Remove from TV Wallboard" : "Add to TV Wallboard"}
                            className={`p-1 rounded-md transition-colors ${
                              isPinned
                                ? "text-amber-400 hover:text-amber-500"
                                : "text-zinc-600 hover:text-zinc-400"
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-400" : ""}`} />
                          </button>
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.itemName}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5 ml-6">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>Min: {item.lowStockThreshold} {item.unit || "units"}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <div
                            className={`text-xl font-black tracking-tight ${
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
            )}

            {/* Bottom Alert / Info */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Showing {displayedProducts.length} selected items</span>
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
          <span>Cod Surv Store — COD Third-Party Contractor Monitor</span>
          <span>•</span>
          <span>100 Annual Camera Quota Tracking</span>
        </div>
        <div className="text-[11px] text-zinc-600">
          Auto-updates via Firestore • Press F11 for Fullscreen Wallboard
        </div>
      </footer>

      {/* ================= MODAL: CONFIGURE TV PRODUCTS ================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-700/80 p-6 shadow-2xl max-h-[85vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Settings className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Select Products for TV Wallboard
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Choose which items to display on the office TV monitor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Search */}
            <div className="py-3 space-y-3">
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleSelectCamerasOnly}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium"
                >
                  Cameras & NVRs Only
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium"
                >
                  Select All ({inventoryItems.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 font-medium"
                >
                  Clear Selection
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products to display..."
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Product Checkboxes List */}
            <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1 my-2 scrollbar-thin">
              {inventoryItems
                .filter((item) =>
                  item.itemName.toLowerCase().includes(configSearch.toLowerCase()) ||
                  item.category.toLowerCase().includes(configSearch.toLowerCase())
                )
                .map((item) => {
                  const isChecked = selectedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-blue-950/30 border-blue-600/50 text-white"
                          : "bg-zinc-950/60 border-zinc-800/60 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePinItem(item.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-zinc-900 border-zinc-700"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {item.itemName}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {item.category}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-white">
                          {item.quantity} {item.unit || "units"}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">
                {selectedItemIds.length} products selected for TV Wallboard
              </span>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
