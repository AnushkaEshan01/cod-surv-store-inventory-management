"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { CameraRelocation, InventoryItem, RelocationStatus } from "@/types";
import {
  subscribeToCameraRelocations,
  subscribeToAnnualTarget,
  calculateProjectStats,
  addCameraRelocation,
  updateCameraRelocation,
  deleteCameraRelocation,
  updateAnnualTarget,
  clearMockCameraRelocations,
} from "@/lib/relocation-service";
import { subscribeToInventory, adjustStock } from "@/lib/inventory-service";
import { RelocationModal } from "@/components/RelocationModal";
import { AdminRequiredModal } from "@/components/AdminRequiredModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import {
  Camera,
  MapPin,
  Calendar,
  User,
  Plus,
  Tv,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Edit2,
  Trash2,
  Lock,
  Target,
  Sparkles,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

export default function RelocationsPage() {
  const { user } = useAuth();
  const [relocations, setRelocations] = useState<CameraRelocation[]>([]);
  const [annualTarget, setAnnualTarget] = useState<number>(100);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CameraRelocation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminActionName, setAdminActionName] = useState("Perform this action");

  // Target Edit Modal
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(100);

  // Firestore Rules Permission Alert State
  const [permissionError, setPermissionError] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    // Admin Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }

    // Inventory Items Collection
    match /inventory_items/{itemId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }

    // Transaction Audit Logs Collection
    match /transaction_logs/{logId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    // Camera Relocations Collection (Public Read, Admin Write)
    match /camera_relocations/{relocId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }

    // Camera Project Settings (Public Read, Admin Write)
    match /project_settings/{settingId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 3000);
  };

  // Real-time subscriptions
  useEffect(() => {
    // Purge any legacy sample mock data from localStorage
    clearMockCameraRelocations();

    const unsubRelocs = subscribeToCameraRelocations(
      (items) => {
        setRelocations(items);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (
          err.message?.toLowerCase().includes("permission") ||
          err.message?.toLowerCase().includes("insufficient")
        ) {
          setPermissionError(true);
        }
      }
    );

    const unsubTarget = subscribeToAnnualTarget((target) => {
      setAnnualTarget(target);
      setTargetInput(target);
    });

    const unsubInv = subscribeToInventory((items) => {
      setInventoryItems(items);
    });

    return () => {
      unsubRelocs();
      unsubTarget();
      unsubInv();
    };
  }, []);

  const stats = useMemo(() => {
    return calculateProjectStats(relocations, annualTarget);
  }, [relocations, annualTarget]);

  // Filtered list
  const filteredRelocations = useMemo(() => {
    return relocations.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.siteName.toLowerCase().includes(q) ||
        (item.cameraModel && item.cameraModel.toLowerCase().includes(q)) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      let matchesFilter = true;
      if (statusFilter === "COD 100 Quota") {
        matchesFilter = item.isQuotaProject !== false;
      } else if (statusFilter === "Non-Quota") {
        matchesFilter = item.isQuotaProject === false;
      } else if (statusFilter !== "All") {
        matchesFilter = item.status === statusFilter;
      }

      return matchesSearch && matchesFilter;
    });
  }, [relocations, searchQuery, statusFilter]);

  // Admin gate check
  const handleOpenAdd = () => {
    if (!user) {
      setAdminActionName("Log a new camera relocation");
      setAdminModalOpen(true);
      return;
    }
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CameraRelocation) => {
    if (!user) {
      setAdminActionName("Edit this camera relocation record");
      setAdminModalOpen(true);
      return;
    }
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    if (!user) {
      setAdminActionName("Delete this camera relocation record");
      setAdminModalOpen(true);
      return;
    }
    setDeletingId(id);
  };

  const handleSubmitRelocation = async (data: {
    siteName: string;
    cameraCount: number;
    cameraModel: string;
    inventoryItemId?: string;
    relocationDate: string;
    technicianName?: string;
    status: RelocationStatus;
    isQuotaProject: boolean;
    notes?: string;
    deductStock?: boolean;
  }) => {
    try {
      if (editingItem) {
        await updateCameraRelocation(editingItem.id, {
          siteName: data.siteName,
          cameraCount: data.cameraCount,
          cameraModel: data.cameraModel,
          inventoryItemId: data.inventoryItemId,
          relocationDate: data.relocationDate,
          technicianName: data.technicianName || "",
          status: data.status,
          isQuotaProject: data.isQuotaProject,
          notes: data.notes,
        });
      } else {
        await addCameraRelocation({
          siteName: data.siteName,
          cameraCount: data.cameraCount,
          cameraModel: data.cameraModel,
          inventoryItemId: data.inventoryItemId,
          relocationDate: data.relocationDate,
          technicianName: data.technicianName || "",
          status: data.status,
          isQuotaProject: data.isQuotaProject,
          notes: data.notes,
        });

        // Deduct from stock if requested
        if (data.deductStock && data.inventoryItemId && user) {
          await adjustStock(
            data.inventoryItemId,
            "OUT",
            data.cameraCount,
            user.email || "admin@codsurv.com",
            `Relocated ${data.cameraCount}x to ${data.siteName}`
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
        setPermissionError(true);
      }
      throw err;
    }
  };

  const handleConfirmDelete = async (_itemId?: string) => {
    if (deletingId) {
      await deleteCameraRelocation(deletingId);
      setDeletingId(null);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAdminActionName("Change the annual camera quota");
      setAdminModalOpen(true);
      return;
    }
    if (targetInput > 0) {
      await updateAnnualTarget(targetInput);
      setIsEditingTarget(false);
    }
  };

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white shadow-xl border border-zinc-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COD Annual Camera Relocation Project</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              COD Annual Camera Relocations & Deployment
            </h1>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Monitoring annual allocation of <strong className="text-white font-semibold">{annualTarget} cameras</strong> for COD facilities and operations.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/display"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-sm transition-all hover:scale-105"
            >
              <Tv className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Launch TV Wallboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-300" />
            </Link>

            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Log Relocation</span>
            </button>
          </div>
        </div>

        {/* Decorative background blur ring */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Firebase Firestore Rules Permission Alert Banner */}
      {permissionError && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Firebase Firestore Security Rules Update Required
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Camera relocations Firestore permission denied. Rules වලට <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">camera_relocations</code> සහ <code className="px-1 py-0.5 rounded bg-amber-500/20 font-mono text-[11px]">project_settings</code> එකතු කර Firebase Console හි Publish කරන්න.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyRules}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all"
            >
              {rulesCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{rulesCopied ? "Copied Rules!" : "Copy Rules"}</span>
            </button>
            <a
              href="https://console.firebase.google.com/project/cod-serv-store-invetory/firestore/rules"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900/10 dark:bg-white/10 hover:bg-zinc-900/20 dark:hover:bg-white/20 transition-all text-amber-950 dark:text-amber-200"
            >
              <span>Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Annual Quota */}
        <div className="glass-card rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Annual Target</span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
              {annualTarget}
            </span>
            <span className="text-xs font-medium text-zinc-500">Cameras</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Fiscal Year Quota</span>
            {user && (
              <button
                onClick={() => setIsEditingTarget(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Change
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Relocated / Completed */}
        <div className="glass-card rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Relocated</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {stats.totalRelocated}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              ({stats.progressPercentage}%)
            </span>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Completed Installations</span>
          </div>
        </div>

        {/* Card 3: Remaining Cameras */}
        <div className="glass-card rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Remaining</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.remaining}
            </span>
            <span className="text-xs font-medium text-zinc-500">Cameras</span>
          </div>
          <div className="mt-3 text-[11px] text-zinc-500">
            <span>To fulfill 100 allocation</span>
          </div>
        </div>

        {/* Card 4: Non-Quota Camera Relocations (Outside 100 Quota) */}
        <div className="glass-card rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
            <span className="text-xs font-semibold tracking-wide uppercase">Non-Quota Relocations</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-purple-600 dark:text-purple-400 tracking-tight">
              {stats.nonQuotaRelocated}
            </span>
            <span className="text-xs font-medium text-zinc-500">Cameras</span>
          </div>
          <div className="mt-3 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            <span>Outside 100 Annual Quota</span>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar Section */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
              Annual 100 Camera Relocation Progress
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stats.totalRelocated} out of {annualTarget} cameras relocated ({stats.progressPercentage}% completed)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
              {stats.remaining} Cameras Left
            </span>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-4 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-xs"
            style={{ width: `${stats.progressPercentage}%` }}
          />
        </div>

        {/* Milestone markers */}
        <div className="flex justify-between text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 px-1 pt-1">
          <span>0 (Start)</span>
          <span>25 Cameras</span>
          <span>50 (Halfway)</span>
          <span>75 Cameras</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{annualTarget} (Goal)</span>
        </div>
      </div>

      {/* Relocations List Header & Search Filter */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">
              Relocation Records & Deployments
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Complete history of camera relocations and site installations
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search site, camera model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-medium gap-1">
              {(["All", "COD 100 Quota", "Non-Quota", "Completed", "In Progress"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    statusFilter === tab
                      ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Relocations Cards / Table */}
        {filteredRelocations.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center border border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              No relocation records found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery ? "Try refining your search terms" : "Start by logging your first camera relocation."}
            </p>
            {!user && (
              <p className="text-[11px] text-zinc-400">
                (Sign in as Administrator to log or edit relocations)
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRelocations.map((item) => {
              const isCompleted = item.status === "Completed";
              const isInProgress = item.status === "In Progress";

              return (
                <div
                  key={item.id}
                  className="glass-card rounded-3xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Location & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-zinc-950 dark:text-white leading-snug">
                            {item.siteName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                              item.isQuotaProject !== false
                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                                : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
                            }`}>
                              {item.isQuotaProject !== false ? "COD 100 Quota" : "Non-Quota"}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-medium">
                              {item.cameraModel || "CCTV Camera"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase shrink-0 ${
                          isCompleted
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                            : isInProgress
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40"
                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                        {isInProgress && <Clock className="w-3 h-3" />}
                        <span>{item.status}</span>
                      </span>
                    </div>

                    {/* Camera count highlight */}
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        <Camera className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Cameras Relocated:</span>
                      </div>
                      <span className="text-base font-extrabold text-zinc-950 dark:text-white">
                        {item.cameraCount} <span className="text-xs font-normal text-zinc-500">units</span>
                      </span>
                    </div>

                    {/* Meta info: Date */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{item.relocationDate}</span>
                    </div>

                    {/* Notes if any */}
                    {item.notes && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2 bg-zinc-100/50 dark:bg-zinc-800/40 p-2 rounded-xl">
                        &quot;{item.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Actions (Admin edit / delete) */}
                  <div className="pt-3 mt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-zinc-400">
                      {isCompleted ? "Counted in Annual Target" : "Pending completion"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Edit record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(item.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Relocation Modal */}
      <RelocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitRelocation}
        editItem={editingItem}
        inventoryItems={inventoryItems}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingId)}
        itemName="this camera relocation record"
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Admin Required Modal */}
      <AdminRequiredModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        actionName={adminActionName}
      />

      {/* Edit Target Modal */}
      {isEditingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm glass-modal rounded-3xl p-6 shadow-2xl border border-white/40 dark:border-white/10 space-y-4">
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Update Annual Camera Target
            </h3>
            <p className="text-xs text-zinc-500">
              Set the total planned annual camera allocation for Cod Surv Store.
            </p>
            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Target Number of Cameras
                </label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={targetInput}
                  onChange={(e) => setTargetInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTarget(false)}
                  className="px-3.5 py-2 text-xs rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                >
                  Save Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
