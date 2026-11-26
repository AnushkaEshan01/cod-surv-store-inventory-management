export type ItemCategory =
  | "CCTV Cameras"
  | "Network Devices"
  | "Cables & Wiring"
  | "Power & Accessories"
  | "Storage & Hard Drives"
  | "Hardware & Tools"
  | "Other";

export interface InventoryItem {
  id: string;
  itemName: string;
  category: ItemCategory | string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string; // ISO string or Firestore Timestamp representation
  description?: string;
  unit?: string; // e.g., 'pcs', 'meters', 'rolls', 'units'
}

export type TransactionType = "IN" | "OUT";

export interface TransactionLog {
  id: string;
  itemId: string;
  itemName: string;
  transactionType: TransactionType;
  amount: number;
  userEmail: string;
  timestamp: string; // ISO timestamp string
  notes?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  role: "admin";
  displayName?: string;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export function getStockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return "out-of-stock";
  if (quantity <= threshold) return "low-stock";
  return "in-stock";
}

export type RelocationStatus = "Completed" | "In Progress" | "Pending";

export interface CameraRelocation {
  id: string;
  siteName: string; // e.g. "COD - Colombo Central Hub"
  cameraCount: number; // e.g. 4
  cameraModel?: string; // e.g. "Hikvision 4MP IP Dome"
  inventoryItemId?: string; // optional linked inventory item
  relocationDate: string; // ISO or YYYY-MM-DD
  technicianName: string; // e.g. "Kasun Perera"
  status: RelocationStatus;
  isQuotaProject?: boolean; // true = Part of COD 100 Annual Quota; false = Non-Quota / Other
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CameraProjectStats {
  annualTarget: number;
  totalRelocated: number; // strictly quota completed cameras (e.g. 62)
  remaining: number; // annualTarget - totalRelocated (e.g. 38)
  progressPercentage: number; // 62%
  nonQuotaRelocated: number; // separate count for non-100 quota camera relocations
  inProgressCount: number;
  pendingCount: number;
  totalSites: number;
}
