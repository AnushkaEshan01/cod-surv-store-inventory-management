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

export const INITIAL_CAMERA_RELOCATIONS: CameraRelocation[] = [];

const LOCAL_STORAGE_RELOCS_KEY = "cod_surv_camera_relocations_v5";
const LOCAL_STORAGE_TARGET_KEY = "cod_surv_annual_camera_target_v5";

export function clearMockCameraRelocations() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_STORAGE_RELOCS_KEY);
    localStorage.removeItem("cod_surv_camera_relocations_v4");
    window.dispatchEvent(new CustomEvent("relocations_updated", { detail: [] }));
  }
}

function getLocalRelocations(): CameraRelocation[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_RELOCS_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Filter out any lingering mock dummy items
    const cleaned = parsed.filter(
      (r: CameraRelocation) =>
        !r.id.startsWith("reloc-cod-") && !r.id.startsWith("reloc-extra-")
    );
    return cleaned;
  } catch {
    return [];
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
  // Quota relocations: isQuotaProject !== false (defaults to true for COD annual project)
  const quotaCompleted = relocations.filter(
    (r) => r.isQuotaProject !== false && r.status === "Completed"
  );
  const totalRelocated = quotaCompleted.reduce((sum, r) => sum + (Number(r.cameraCount) || 0), 0);

  // Non-quota relocations: isQuotaProject === false
  const nonQuotaCompleted = relocations.filter(
    (r) => r.isQuotaProject === false && r.status === "Completed"
  );
  const nonQuotaRelocated = nonQuotaCompleted.reduce((sum, r) => sum + (Number(r.cameraCount) || 0), 0);

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
    nonQuotaRelocated,
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
              isQuotaProject: data.isQuotaProject !== false,
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
