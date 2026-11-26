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
  Clock,
  CheckCircle2,
  Boxes,
  Maximize2,
  Minimize2,
  Radio,
  Layers,
  ArrowLeft,
  Sparkles,
  Settings,
  Star,
  X,
  Search,
  Building2,
  Sun,
  Moon,
} from "lucide-react";

const TV_SELECTED_ITEMS_KEY = "cod_surv_tv_selected_items";
const TV_THEME_KEY = "cod_surv_tv_theme";

export default function DisplayWallboardPage() {
  const [relocations, setRelocations] = useState<CameraRelocation[]>([]);
  const [annualTarget, setAnnualTarget] = useState<number>(100);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideNavBar, setHideNavBar] = useState(false);
  const [tvTheme, setTvTheme] = useState<"dark" | "light">("dark");

  // TV View Mode: "selected" | "low-stock" | "all"
  const [viewFilter, setViewFilter] = useState<"selected" | "low-stock" | "all">("selected");

  // Selected item IDs for TV display
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configSearch, setConfigSearch] = useState("");

  const isDark = tvTheme === "dark";

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved theme and selected items from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(TV_THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTvTheme(savedTheme);
      }

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

  // Theme toggle handler
  const toggleTvTheme = () => {
    const nextTheme = tvTheme === "dark" ? "light" : "dark";
    setTvTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(TV_THEME_KEY, nextTheme);
    }
  };

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

  const isFullViewActive = isFullscreen || hideNavBar;

  return (
    <div
      className={`min-h-screen font-sans antialiased p-4 sm:p-6 lg:p-8 flex flex-col justify-between relative transition-colors duration-300 ${
        isDark
          ? "bg-zinc-950 text-white selection:bg-emerald-500 selection:text-black"
          : "bg-slate-100 text-zinc-900 selection:bg-emerald-500 selection:text-white"
      }`}
    >
      {/* Floating Button when Full View / Fullscreen is Active */}
      {isFullViewActive && (
        <div className="fixed top-3 right-3 z-50 flex items-center gap-2 animate-fade-in">
          <div
            className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-mono shadow-2xl flex items-center gap-2 ${
              isDark
                ? "bg-zinc-900/90 border-zinc-700/80 text-zinc-300"
                : "bg-white/90 border-zinc-300 text-zinc-800"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{formattedTime}</span>
          </div>

          {/* Theme Toggle Button in Full View */}
          <button
            onClick={toggleTvTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all shadow-2xl text-xs font-semibold ${
              isDark
                ? "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300 hover:text-white"
                : "bg-white/90 hover:bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-950"
            }`}
            title={isDark ? "Switch to White / Light Theme" : "Switch to Dark Theme"}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              setHideNavBar(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all shadow-2xl text-xs font-semibold ${
              isDark
                ? "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700/80 text-zinc-300 hover:text-white"
                : "bg-white/90 hover:bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-950"
            }`}
            title="Exit Full View (Show Header)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Show Nav Bar</span>
          </button>
        </div>
      )}

      {/* Top Bar / Header (Hidden when in Full View or Fullscreen) */}
      {!isFullViewActive && (
        <header
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b animate-fade-in transition-colors ${
            isDark ? "border-zinc-800/80" : "border-zinc-200"
          }`}
        >
          {/* Brand & Mode */}
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isDark
                  ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800"
                  : "bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 border-zinc-200 shadow-2xs"
              }`}
              title="Back to Web App"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Store Dashboard</span>
            </Link>

            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-md ${
                  isDark ? "bg-white text-zinc-950" : "bg-zinc-900 text-white"
                }`}
              >
                <Layers className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-extrabold tracking-tight ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    Cod Surv
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    Office Wallboard
                  </span>
                </div>
                <span className={`text-xs font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  COD Camera Relocations & Live Inventory Monitor
                </span>
              </div>
            </div>
          </div>

          {/* Live Status & Clock & Full View & Theme Controls */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Sync Status */}
            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
                isDark
                  ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <Radio className="w-3.5 h-3.5" />
              <span>REALTIME SYNC</span>
            </div>

            {/* Large Digital Clock */}
            <div className="text-right">
              <div
                className={`text-2xl sm:text-3xl font-mono font-extrabold tracking-tight drop-shadow-sm ${
                  isDark ? "text-white" : "text-zinc-950"
                }`}
              >
                {formattedTime}
              </div>
              <div className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {formattedDate}
              </div>
            </div>

            {/* Theme Toggle & Full View Buttons */}
            <div
              className={`flex items-center gap-2 pl-2 border-l ${
                isDark ? "border-zinc-800" : "border-zinc-300"
              }`}
            >
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTvTheme}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:scale-105 shadow-2xs ${
                  isDark
                    ? "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800"
                    : "bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300"
                }`}
                title={isDark ? "Switch to White (Light) Theme" : "Switch to Dark Theme"}
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>White Theme</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Dark Theme</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setHideNavBar(true);
                  toggleFullscreen();
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all hover:scale-105 shadow-2xs ${
                  isDark
                    ? "bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-800"
                    : "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300"
                }`}
                title="Full View (Hide Header & Enter Fullscreen)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Full View</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Grid: Left side COD Relocations, Right side Inventory */}
      <main className="my-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* ================= LEFT SECTION: COD CAMERA RELOCATION (6 COLS) ================= */}
        <section className="lg:col-span-6 flex flex-col justify-between space-y-6">
          {/* Main COD Relocations Command Card */}
          <div
            className={`p-7 rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col justify-between flex-1 transition-colors ${
              isDark
                ? "bg-zinc-900/80 border-zinc-800/80 text-white"
                : "bg-white border-zinc-200 text-zinc-900 shadow-xl"
            }`}
          >
            {/* Header with COD Contractor Tag */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold ${
                    isDark
                      ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>COD Camera Relocation Project</span>
                </div>
                <span className={`text-xs font-bold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Annual 100 Camera Contract
                </span>
              </div>

              <h2
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDark ? "text-white" : "text-zinc-950"
                }`}
              >
                COD Camera Relocation Status
              </h2>
              <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                Tracking annual camera quota allocated to COD operations
              </p>
            </div>

            {/* Giant Numbers: Left = Relocated So Far, Right = Non-Quota Relocations */}
            <div
              className={`my-6 p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-around gap-6 ${
                isDark
                  ? "bg-zinc-950/70 border-zinc-800/60"
                  : "bg-slate-50 border-zinc-200 shadow-inner"
              }`}
            >
              {/* Left: Giant Completed Numbers (Quota) */}
              <div className="text-center sm:text-left space-y-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  Cameras Relocated So Far
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-6xl sm:text-7xl font-black tracking-tight text-emerald-500">
                    {stats.totalRelocated}
                  </span>
                  <span
                    className={`text-2xl font-bold ${
                      isDark ? "text-zinc-500" : "text-zinc-400"
                    }`}
                  >
                    / {annualTarget}
                  </span>
                </div>
                <p
                  className={`text-xs font-semibold flex items-center justify-center sm:justify-start gap-1.5 ${
                    isDark ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{stats.totalRelocated} Completed out of {annualTarget} Target</span>
                </p>
              </div>

              {/* Right: NON-QUOTA RELOCATIONS (Replaces old Remaining Box) */}
              <div
                className={`p-5 rounded-2xl border text-center min-w-[165px] transition-all shadow-sm ${
                  isDark
                    ? "bg-purple-950/30 border-purple-800/60 text-purple-300"
                    : "bg-purple-50 border-purple-200 text-purple-900"
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                    isDark ? "text-purple-400" : "text-purple-700"
                  }`}
                >
                  Non-Quota Relocations
                </span>
                <span
                  className={`text-4xl font-black tracking-tight ${
                    isDark ? "text-purple-400" : "text-purple-700"
                  }`}
                >
                  {stats.nonQuotaRelocated}
                </span>
                <span
                  className={`block text-[11px] font-semibold mt-1 ${
                    isDark ? "text-purple-300/80" : "text-purple-600"
                  }`}
                >
                  Outside 100 Quota
                </span>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Contract Completion:</span>
                <span className="text-emerald-500 font-bold text-sm">
                  {stats.progressPercentage}% Target Achieved
                </span>
              </div>
              <div
                className={`relative w-full h-5 rounded-full overflow-hidden p-0.5 border ${
                  isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-200 border-zinc-300"
                }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20"
                  style={{ width: `${stats.progressPercentage}%` }}
                />
              </div>
              <div
                className={`flex justify-between text-[11px] font-semibold pt-1 ${
                  isDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                <span>0 Completed</span>
                <span>25 (Quarter)</span>
                <span>50 (Halfway)</span>
                <span className="text-emerald-500 font-bold">{stats.totalRelocated} (Current)</span>
                <span>{annualTarget} Target</span>
              </div>
            </div>

            {/* Relocation Overview Cards: COD 100 Quota & Remaining to Deploy */}
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4 border-t ${
                isDark ? "border-zinc-800/60" : "border-zinc-200"
              }`}
            >
              <div
                className={`p-4 rounded-2xl border ${
                  isDark
                    ? "bg-zinc-950/60 border-zinc-800/50"
                    : "bg-slate-50 border-zinc-200"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-blue-500 mb-1 font-semibold">
                  <Building2 className="w-4 h-4" />
                  <span>COD 100 Quota</span>
                </div>
                <div
                  className={`text-2xl font-black ${
                    isDark ? "text-white" : "text-zinc-950"
                  }`}
                >
                  {stats.totalRelocated}{" "}
                  <span className={`text-xs font-normal ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    / {annualTarget}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-500 font-semibold mt-0.5">
                  {stats.progressPercentage}% Contract Fulfilled
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border ${
                  isDark
                    ? "bg-amber-950/20 border-amber-800/50"
                    : "bg-amber-50/80 border-amber-200"
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-semibold mb-1 ${
                    isDark ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Remaining to Deploy</span>
                </div>
                <div
                  className={`text-2xl font-black ${
                    isDark ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  {stats.remaining}{" "}
                  <span
                    className={`text-xs font-normal ${
                      isDark ? "text-zinc-500" : "text-zinc-400"
                    }`}
                  >
                    cameras
                  </span>
                </div>
                <div
                  className={`text-[11px] font-semibold mt-0.5 ${
                    isDark ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  To fulfill 100 annual quota
                </div>
              </div>
            </div>

            {/* Bottom Note */}
            <div
              className={`mt-5 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? "border-zinc-800/60 text-zinc-500" : "border-zinc-200 text-zinc-500"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  COD 100 Quota: <strong>{stats.totalRelocated} Done</strong> ({stats.remaining} Left)
                </span>
              </span>
              <span
                className={`font-semibold ${
                  isDark ? "text-purple-400" : "text-purple-700"
                }`}
              >
                ★ {stats.nonQuotaRelocated} Non-Quota Relocations
              </span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT SECTION: STORE INVENTORY STOCK (6 COLS) ================= */}
        <section className="lg:col-span-6 flex flex-col justify-between space-y-6">
          {/* Inventory Summary Header Card */}
          <div
            className={`p-6 rounded-3xl border shadow-2xl transition-colors ${
              isDark
                ? "bg-zinc-900/80 border-zinc-800/80 text-white"
                : "bg-white border-zinc-200 text-zinc-900 shadow-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl border ${
                    isDark
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  }`}
                >
                  <Boxes className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2
                    className={`text-lg font-extrabold tracking-tight ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    Store Inventory Stock
                  </h2>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Warehouse equipment & stock overview
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-2xl font-black ${
                    isDark ? "text-white" : "text-zinc-950"
                  }`}
                >
                  {inventoryStats.totalQuantity}
                </span>
                <span
                  className={`block text-[10px] uppercase font-bold tracking-wider ${
                    isDark ? "text-zinc-500" : "text-zinc-400"
                  }`}
                >
                  Total Units
                </span>
              </div>
            </div>

            {/* Quick Status Pill Counters */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div
                className={`p-3 rounded-2xl border text-center ${
                  isDark
                    ? "bg-zinc-950/60 border-zinc-800/50"
                    : "bg-slate-50 border-zinc-200"
                }`}
              >
                <span className="text-xl font-extrabold text-emerald-500">
                  {inventoryStats.inStockCount}
                </span>
                <span
                  className={`block text-[10px] font-semibold uppercase mt-0.5 ${
                    isDark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  Optimal
                </span>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center ${
                  inventoryStats.lowStockCount > 0
                    ? isDark
                      ? "bg-amber-950/30 border-amber-800/50 text-amber-400"
                      : "bg-amber-50 border-amber-300 text-amber-700"
                    : isDark
                    ? "bg-zinc-950/60 border-zinc-800/50 text-zinc-500"
                    : "bg-slate-50 border-zinc-200 text-zinc-400"
                }`}
              >
                <span className="text-xl font-extrabold">
                  {inventoryStats.lowStockCount}
                </span>
                <span className="block text-[10px] font-semibold uppercase mt-0.5">
                  Low Stock
                </span>
              </div>

              <div
                className={`p-3 rounded-2xl border text-center ${
                  inventoryStats.outOfStockCount > 0
                    ? isDark
                      ? "bg-rose-950/30 border-rose-800/50 text-rose-400 animate-pulse"
                      : "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                    : isDark
                    ? "bg-zinc-950/60 border-zinc-800/50 text-zinc-500"
                    : "bg-slate-50 border-zinc-200 text-zinc-400"
                }`}
              >
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
          <div
            className={`p-6 rounded-3xl border shadow-2xl flex-1 flex flex-col justify-between transition-colors ${
              isDark
                ? "bg-zinc-900/80 border-zinc-800/80 text-white"
                : "bg-white border-zinc-200 text-zinc-900 shadow-xl"
            }`}
          >
            {/* Controls Row: View Tabs & Customize Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div
                className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs ${
                  isDark
                    ? "bg-zinc-950 border-zinc-800/80"
                    : "bg-slate-100 border-zinc-200"
                }`}
              >
                <button
                  onClick={() => setViewFilter("selected")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    viewFilter === "selected"
                      ? isDark
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                      : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-zinc-600 hover:text-zinc-950"
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
                      : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <span>Low Stock Only</span>
                </button>

                <button
                  onClick={() => setViewFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    viewFilter === "all"
                      ? isDark
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "bg-white text-zinc-950 shadow-xs border border-zinc-200/80"
                      : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-zinc-600 hover:text-zinc-950"
                  }`}
                >
                  <span>All ({inventoryItems.length})</span>
                </button>
              </div>

              {/* Configure TV Products Button */}
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 shadow-2xs ${
                  isDark
                    ? "bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300"
                }`}
                title="Select which products appear on the TV display"
              >
                <Settings className="w-3.5 h-3.5 text-blue-500" />
                <span>Select TV Items</span>
              </button>
            </div>

            {/* Items List */}
            {displayedProducts.length === 0 ? (
              <div
                className={`py-12 text-center space-y-2 ${
                  isDark ? "text-zinc-500" : "text-zinc-400"
                }`}
              >
                <Boxes className="w-8 h-8 mx-auto" />
                <p className="text-xs">No products to display in this view.</p>
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-xs text-blue-500 underline font-medium"
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
                          ? isDark
                            ? "bg-rose-950/20 border-rose-800/40"
                            : "bg-rose-50 border-rose-200"
                          : isLowStock
                          ? isDark
                            ? "bg-amber-950/20 border-amber-800/40"
                            : "bg-amber-50 border-amber-200"
                          : isDark
                          ? "bg-zinc-950/60 border-zinc-800/60"
                          : "bg-slate-50 border-zinc-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePinItem(item.id)}
                            title={isPinned ? "Remove from TV Wallboard" : "Add to TV Wallboard"}
                            className={`p-1 rounded-md transition-colors ${
                              isPinned
                                ? "text-amber-500 hover:text-amber-600"
                                : isDark
                                ? "text-zinc-600 hover:text-zinc-400"
                                : "text-zinc-400 hover:text-zinc-600"
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isPinned ? "fill-amber-500" : ""}`} />
                          </button>
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isDark ? "text-white" : "text-zinc-900"
                            }`}
                          >
                            {item.itemName}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] flex items-center gap-2 mt-0.5 ml-6 ${
                            isDark ? "text-zinc-500" : "text-zinc-500"
                          }`}
                        >
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>
                            Min: {item.lowStockThreshold} {item.unit || "units"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <div
                            className={`text-xl font-black tracking-tight ${
                              isOutOfStock
                                ? "text-rose-500"
                                : isLowStock
                                ? isDark
                                  ? "text-amber-400"
                                  : "text-amber-600"
                                : isDark
                                ? "text-emerald-400"
                                : "text-emerald-600"
                            }`}
                          >
                            {item.quantity}
                          </div>
                          <div
                            className={`text-[10px] font-medium ${
                              isDark ? "text-zinc-500" : "text-zinc-500"
                            }`}
                          >
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
                              : "bg-emerald-500"
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
            <div
              className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? "border-zinc-800/60 text-zinc-400" : "border-zinc-200 text-zinc-500"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Showing {displayedProducts.length} selected items</span>
              </span>
              <span className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                Press <strong>F11</strong> for Fullscreen TV
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer ticker */}
      <footer
        className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-2 ${
          isDark ? "border-zinc-900 text-zinc-500" : "border-zinc-200 text-zinc-500"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Cod Surv Store — Live Surveillance Wallboard</span>
          <span>•</span>
          <span>100 Annual Camera Quota Tracking</span>
        </div>
        <div className={`text-[11px] ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
          Auto-updates via Firestore • Press F11 for Fullscreen Wallboard
        </div>
      </footer>

      {/* ================= MODAL: CONFIGURE TV PRODUCTS ================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div
            className={`relative w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[85vh] flex flex-col justify-between ${
              isDark
                ? "bg-zinc-900 border-zinc-700/80 text-white"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-start justify-between pb-4 border-b ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl border ${
                    isDark
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-blue-50 text-blue-600 border-blue-200"
                  }`}
                >
                  <Settings className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3
                    className={`text-base font-bold ${
                      isDark ? "text-white" : "text-zinc-950"
                    }`}
                  >
                    Select Products for TV Wallboard
                  </h3>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Choose which items to display on the office TV monitor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className={`p-1.5 rounded-xl transition-colors ${
                  isDark
                    ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
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
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200"
                  }`}
                >
                  Cameras & NVRs Only
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200"
                  }`}
                >
                  Select All ({inventoryItems.length})
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    isDark
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-rose-600 border border-zinc-200"
                  }`}
                >
                  Clear Selection
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search
                  className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-zinc-400" : "text-zinc-400"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search products to display..."
                  value={configSearch}
                  onChange={(e) => setConfigSearch(e.target.value)}
                  className={`w-full pl-9 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500"
                      : "bg-slate-50 border-zinc-200 text-zinc-900 placeholder-zinc-400"
                  }`}
                />
              </div>
            </div>

            {/* Product Checkboxes List */}
            <div className="overflow-y-auto max-h-[350px] space-y-2 pr-1 my-2 scrollbar-thin">
              {inventoryItems
                .filter(
                  (item) =>
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
                          ? isDark
                            ? "bg-blue-950/30 border-blue-600/50 text-white"
                            : "bg-blue-50/90 border-blue-400 text-zinc-900"
                          : isDark
                          ? "bg-zinc-950/60 border-zinc-800/60 text-zinc-300 hover:border-zinc-700"
                          : "bg-slate-50 border-zinc-200 text-zinc-800 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePinItem(item.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-bold truncate ${
                              isDark ? "text-white" : "text-zinc-950"
                            }`}
                          >
                            {item.itemName}
                          </div>
                          <div
                            className={`text-[10px] ${
                              isDark ? "text-zinc-500" : "text-zinc-500"
                            }`}
                          >
                            {item.category}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-extrabold ${
                            isDark ? "text-white" : "text-zinc-950"
                          }`}
                        >
                          {item.quantity} {item.unit || "units"}
                        </span>
                      </div>
                    </label>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div
              className={`pt-3 border-t flex items-center justify-between text-xs ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <span className={isDark ? "text-zinc-400" : "text-zinc-500"}>
                {selectedItemIds.length} products selected for TV Wallboard
              </span>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className={`px-4 py-2 rounded-xl font-bold transition-colors ${
                  isDark
                    ? "bg-white text-zinc-950 hover:bg-zinc-200"
                    : "bg-zinc-950 text-white hover:bg-zinc-800"
                }`}
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