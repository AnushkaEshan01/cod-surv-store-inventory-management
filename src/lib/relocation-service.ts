import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { CameraRelocation, CameraProjectStats } from "@/types";

export const DEFAULT_ANNUAL_TARGET = 100;

export const INITIAL_CAMERA_RELOCATIONS: CameraRelocation[] = [
  {
    id: "reloc-cod-1",
    siteName: "COD - Central Operations & Logistics Hub (Colombo)",
    cameraCount: 16,
    cameraModel: "Hikvision 4MP IP Dome Camera",
    inventoryItemId: "item-1",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString().split("T")[0],
    technicianName: "Kasun Perera",
    status: "Completed",
    notes: "Main warehouse loading dock and sorting facility relocation completed.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
  {
    id: "reloc-cod-2",
    siteName: "COD - Kandy Regional Distribution Facility",
    cameraCount: 12,
    cameraModel: "Dahua 2MP Bullet Camera",
    inventoryItemId: "item-2",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 12).toISOString().split("T")[0],
    technicianName: "Nuwan Silva",
    status: "Completed",
    notes: "Perimeter fence and dispatch bay camera relocation.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString(),
  },
  {
    id: "reloc-cod-3",
    siteName: "COD - Galle Logistics Center",
    cameraCount: 10,
    cameraModel: "Hikvision 4MP IP Dome Camera",
    inventoryItemId: "item-1",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 20).toISOString().split("T")[0],
    technicianName: "Pradeep Kumara",
    status: "Completed",
    notes: "Internal storage racks and security perimeter repositioning.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 20).toISOString(),
  },
  {
    id: "reloc-cod-4",
    siteName: "COD - Negombo Express Facility",
    cameraCount: 8,
    cameraModel: "Hikvision 4MP IP Dome Camera",
    inventoryItemId: "item-1",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 28).toISOString().split("T")[0],
    technicianName: "Kasun Perera",
    status: "Completed",
    notes: "Security gate and express counter coverage upgrade.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 28).toISOString(),
  },
  {
    id: "reloc-cod-5",
    siteName: "COD - Kurunegala Regional Depot",
    cameraCount: 8,
    cameraModel: "Dahua 2MP Bullet Camera",
    inventoryItemId: "item-2",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 35).toISOString().split("T")[0],
    technicianName: "Nuwan Silva",
    status: "Completed",
    notes: "Heavy vehicle parking and loading bay camera relocation.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
  },
  {
    id: "reloc-cod-6",
    siteName: "COD - Gampaha Sorting Center",
    cameraCount: 8,
    cameraModel: "Hikvision 4MP IP Dome Camera",
    inventoryItemId: "item-1",
    relocationDate: new Date(Date.now() - 3600000 * 24 * 42).toISOString().split("T")[0],
    technicianName: "Pradeep Kumara",
    status: "Completed",
    notes: "Parcel sorting lines and conveyor belt surveillance relocation.",
    createdAt: new Date(Date.now() - 3600000 * 24 * 42).toISOString(),
  },
  {
    id: "reloc-cod-7",
    siteName: "COD - Jaffna Logistics Center",
    cameraCount: 6,
    cameraModel: "Hikvision 4MP IP Dome Camera",
    inventoryItemId: "item-1",
    relocationDate: new Date(Date.now() + 3600000 * 24 * 3).toISOString().split("T")[0],
    technicianName: "Kasun Perera",
    status: "In Progress",
    notes: "Northern provincial hub setup underway.",
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_RELOCS_KEY = "cod_surv_camera_relocations_v3";
const LOCAL_STORAGE_TARGET_KEY = "cod_surv_annual_camera_target_v3";

function getLocalRelocations(): CameraRelocation[] {
  if (typeof window === "undefined") return INITIAL_CAMERA_RELOCATIONS;
  const stored = localStorage.getItem(LOCAL_STORAGE_RELOCS_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_RELOCS_KEY, JSON.stringify(INITIAL_CAMERA_RELOCATIONS));
    return INITIAL_CAMERA_RELOCATIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_CAMERA_RELOCATIONS;
  }
}

function saveLocalRelocations(relocs: CameraRelocation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_RELOCS_KEY, JSON.stringify(relocs));
  window.dispatchEvent(new CustomEvent("relocations_updated", { detail: relocs }));
}

function getLocalTarget(): number {
  if (typeof window === "undefined") return DEFAULT_ANNUAL_TARGET;
  const stored = localStorage.getItem(LOCAL_STORAGE_TARGET_KEY);
  return stored ? Number(stored) || DEFAULT_ANNUAL_TARGET : DEFAULT_ANNUAL_TARGET;
}

function saveLocalTarget(target: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_TARGET_KEY, String(target));
  window.dispatchEvent(new CustomEvent("project_target_updated", { detail: target }));
}

/**
 * Calculate camera project statistics from list of relocations and target
 */
export function calculateProjectStats(
  relocations: CameraRelocation[],
  annualTarget: number = DEFAULT_ANNUAL_TARGET
): CameraProjectStats {
  const completedRelocs = relocations.filter((r) => r.status === "Completed");
  const totalRelocated = completedRelocs.reduce((sum, r) => sum + (Number(r.cameraCount) || 0), 0);
  const inProgressCount = relocations
    .filter((r) => r.status === "In Progress")
    .reduce((sum, r) => sum + (Number(r.cameraCount) || 0), 0);
  const pendingCount = relocations
    .filter((r) => r.status === "Pending")
    .reduce((sum, r) => sum + (Number(r.cameraCount) || 0), 0);

  const remaining = Math.max(0, annualTarget - totalRelocated);
  const progressPercentage = annualTarget > 0 ? Math.min(100, Math.round((totalRelocated / annualTarget) * 100)) : 0;
  const uniqueSites = new Set(relocations.map((r) => r.siteName.trim().toLowerCase())).size;

  return {
    annualTarget,
    totalRelocated,
    remaining,
    progressPercentage,
    inProgressCount,
    pendingCount,
    totalSites: uniqueSites,
  };
}

/**
 * Real-time Subscription to Camera Relocations
 */
export function subscribeToCameraRelocations(
  onUpdate: (relocs: CameraRelocation[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (db && isFirebaseConfigured) {
    try {
      const relocsCollection = collection(db, "camera_relocations");
      const q = query(relocsCollection, orderBy("relocationDate", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            onUpdate([]);
            return;
          }
          const list: CameraRelocation[] = snapshot.docs.map((d) => {
            const data = d.data();
            let createdAt = new Date().toISOString();
            if (data.createdAt instanceof Timestamp) {
              createdAt = data.createdAt.toDate().toISOString();
            } else if (data.createdAt) {
              createdAt = String(data.createdAt);
            }
            return {
              id: d.id,
              siteName: data.siteName || "Unnamed Site",
              cameraCount: Number(data.cameraCount) || 1,
              cameraModel: data.cameraModel || "Standard CCTV Camera",
              inventoryItemId: data.inventoryItemId || undefined,
              relocationDate: data.relocationDate || new Date().toISOString().split("T")[0],
              technicianName: data.technicianName || "Field Technician",
              status: data.status || "Completed",
              notes: data.notes || "",
              createdAt,
            };
          });
          onUpdate(list);
        },
        (error) => {
          // Graceful fallback to local mock data
          onUpdate(getLocalRelocations());
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn("Falling back to local camera relocations storage:", e);
    }
  }

  // Local storage fallback for offline / preview
  const handleLocalUpdate = (e: Event) => {
    const custom = e as CustomEvent<CameraRelocation[]>;
    if (custom.detail) onUpdate(custom.detail);
  };
  window.addEventListener("relocations_updated", handleLocalUpdate);
  onUpdate(getLocalRelocations());

  return () => {
    window.removeEventListener("relocations_updated", handleLocalUpdate);
  };
}

/**
 * Real-time Subscription to Annual Target Settings
 */
export function subscribeToAnnualTarget(
  onUpdate: (target: number) => void
): () => void {
  if (db && isFirebaseConfigured) {
    try {
      const settingsDoc = doc(db, "project_settings", "camera_project");
      const unsubscribe = onSnapshot(
        settingsDoc,
        (snap) => {
          if (snap.exists() && snap.data().annualTarget) {
            onUpdate(Number(snap.data().annualTarget));
          } else {
            onUpdate(DEFAULT_ANNUAL_TARGET);
          }
        },
        () => {
          onUpdate(getLocalTarget());
        }
      );
      return unsubscribe;
    } catch {
      // fallback
    }
  }

  const handleTarget = (e: Event) => {
    const custom = e as CustomEvent<number>;
    if (custom.detail) onUpdate(custom.detail);
  };
  window.addEventListener("project_target_updated", handleTarget);
  onUpdate(getLocalTarget());

  return () => {
    window.removeEventListener("project_target_updated", handleTarget);
  };
}

/**
 * Add a new camera relocation entry
 */
export async function addCameraRelocation(
  item: Omit<CameraRelocation, "id" | "createdAt">
): Promise<string> {
  const newId = `reloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  if (db && isFirebaseConfigured) {
    const relocRef = doc(db, "camera_relocations", newId);
    await setDoc(relocRef, {
      ...item,
      cameraCount: Number(item.cameraCount) || 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newId;
  }

  // Local fallback
  const current = getLocalRelocations();
  const created: CameraRelocation = {
    ...item,
    id: newId,
    createdAt: new Date().toISOString(),
  };
  saveLocalRelocations([created, ...current]);
  return newId;
}

/**
 * Update an existing camera relocation entry
 */
export async function updateCameraRelocation(
  id: string,
  updates: Partial<Omit<CameraRelocation, "id" | "createdAt">>
): Promise<void> {
  if (db && isFirebaseConfigured) {
    const relocRef = doc(db, "camera_relocations", id);
    await updateDoc(relocRef, {
      ...updates,
      ...(updates.cameraCount !== undefined && { cameraCount: Number(updates.cameraCount) }),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  // Local fallback
  const current = getLocalRelocations();
  const updated = current.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r));
  saveLocalRelocations(updated);
}

/**
 * Delete a camera relocation entry
 */
export async function deleteCameraRelocation(id: string): Promise<void> {
  if (db && isFirebaseConfigured) {
    const relocRef = doc(db, "camera_relocations", id);
    await deleteDoc(relocRef);
    return;
  }

  // Local fallback
  const current = getLocalRelocations();
  saveLocalRelocations(current.filter((r) => r.id !== id));
}

/**
 * Update annual target quota
 */
export async function updateAnnualTarget(target: number): Promise<void> {
  if (db && isFirebaseConfigured) {
    const settingsRef = doc(db, "project_settings", "camera_project");
    await setDoc(settingsRef, {
      annualTarget: Number(target),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return;
  }

  saveLocalTarget(target);
}
