"use client";

import React, { useState, useEffect } from "react";
import { CameraRelocation, InventoryItem, RelocationStatus } from "@/types";
import { X, MapPin, Camera, User, Calendar, FileText, CheckCircle2, AlertCircle, Layers } from "lucide-react";

interface RelocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
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
  }) => Promise<void>;
  editItem?: CameraRelocation | null;
  inventoryItems?: InventoryItem[];
}

export function RelocationModal({
  isOpen,
  onClose,
  onSubmit,
  editItem,
  inventoryItems = [],
}: RelocationModalProps) {
  const [siteName, setSiteName] = useState("");
  const [cameraCount, setCameraCount] = useState<number | string>(1);
  const [cameraModel, setCameraModel] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [deductStock, setDeductStock] = useState(false);
  const [relocationDate, setRelocationDate] = useState(new Date().toISOString().split("T")[0]);
  const [technicianName, setTechnicianName] = useState("");
  const [status, setStatus] = useState<RelocationStatus>("Completed");
  const [isQuotaProject, setIsQuotaProject] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter inventory items to camera categories if available
  const cameraInventoryItems = inventoryItems.filter(
    (item) => item.category === "CCTV Cameras" || item.itemName.toLowerCase().includes("camera")
  );

  useEffect(() => {
    if (editItem) {
      setSiteName(editItem.siteName || "");
      setCameraCount(editItem.cameraCount || 1);
      setCameraModel(editItem.cameraModel || "");
      setSelectedInventoryId(editItem.inventoryItemId || "");
      setDeductStock(false); // don't re-deduct on edit
      setRelocationDate(editItem.relocationDate || new Date().toISOString().split("T")[0]);
      setTechnicianName(editItem.technicianName || "");
      setStatus(editItem.status || "Completed");
      setIsQuotaProject(editItem.isQuotaProject !== false);
      setNotes(editItem.notes || "");
    } else {
      setSiteName("");
      setCameraCount(1);
      setCameraModel(cameraInventoryItems[0]?.itemName || "Hikvision 4MP IP Dome Camera");
      setSelectedInventoryId(cameraInventoryItems[0]?.id || "");
      setDeductStock(false);
      setRelocationDate(new Date().toISOString().split("T")[0]);
      setTechnicianName("");
      setStatus("Completed");
      setIsQuotaProject(true);
      setNotes("");
    }
    setError(null);
  }, [editItem, isOpen]);

  // Handle inventory selection
  const handleInventorySelect = (id: string) => {
    setSelectedInventoryId(id);
    const found = inventoryItems.find((it) => it.id === id);
    if (found) {
      setCameraModel(found.itemName);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Number(cameraCount);
    if (!siteName.trim()) {
      setError("Please enter the site / location name");
      return;
    }
    if (isNaN(count) || count <= 0) {
      setError("Camera count must be at least 1");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        siteName: siteName.trim(),
        cameraCount: count,
        cameraModel: cameraModel.trim() || "CCTV Camera",
        inventoryItemId: selectedInventoryId || undefined,
        relocationDate,
        technicianName: technicianName.trim() || undefined,
        status,
        isQuotaProject,
        notes: notes.trim(),
        deductStock: !editItem && deductStock && Boolean(selectedInventoryId),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save relocation record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-modal rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/40 dark:border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
              {editItem ? "Edit Camera Relocation" : "Log Camera Relocation"}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Track installation against the 100 annual camera allocation
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quota vs Non-Quota Selector */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Project Quota Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isQuotaProject
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200 font-semibold"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="quotaType"
                  checked={isQuotaProject}
                  onChange={() => setIsQuotaProject(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>COD 100 Annual Quota</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  !isQuotaProject
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-900 dark:text-purple-200 font-semibold"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="quotaType"
                  checked={!isQuotaProject}
                  onChange={() => setIsQuotaProject(false)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>Non-Quota (Outside 100)</span>
              </label>
            </div>
            <p className="text-[11px] text-zinc-500">
              {isQuotaProject
                ? "This relocation will be counted towards the 100 annual camera allocation."
                : "This relocation is outside the 100 quota and will be tracked separately."}
            </p>
          </div>

          {/* Site / Location Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Site / Client Location *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                placeholder="e.g. Commercial Bank - Colombo 03 / Keells Nawala"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>
          </div>

          {/* Camera Count & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Number of Cameras Relocated *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={cameraCount}
                onChange={(e) => setCameraCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RelocationStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              >
                <option value="Completed">Completed (Installed)</option>
                <option value="In Progress">In Progress (Work Ongoing)</option>
                <option value="Pending">Pending (Scheduled)</option>
              </select>
            </div>
          </div>

          {/* Camera Model & Link to Store Inventory */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Camera Model / Description
            </label>
            <input
              type="text"
              placeholder="e.g. Hikvision 4MP IP Dome (DS-2CD1143G0-I)"
              value={cameraModel}
              onChange={(e) => setCameraModel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all mb-2"
            />

            {/* Optional Link to Store Item */}
            {inventoryItems.length > 0 && !editItem && (
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deductStock}
                      onChange={(e) => setDeductStock(e.target.checked)}
                      className="rounded text-zinc-900 focus:ring-zinc-900 w-3.5 h-3.5"
                    />
                    <span>Deduct cameras from Store Inventory Stock</span>
                  </label>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400">Optional</span>
                </div>

                {deductStock && (
                  <div>
                    <label className="block text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                      Select Inventory Item to Deduct ({cameraCount} units):
                    </label>
                    <select
                      value={selectedInventoryId}
                      onChange={(e) => handleInventorySelect(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                    >
                      <option value="">-- Select Store Item --</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.itemName} (Available: {item.quantity} {item.unit || "pcs"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Relocation Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Relocation Date *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="date"
                required
                value={relocationDate}
                onChange={(e) => setRelocationDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
              />
            </div>
          </div>

          {/* Notes & Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Work Notes / Installation Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Relocated 2 cameras from Gate 1 to Warehouse loading dock..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editItem ? "Update Relocation" : "Save Relocation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
