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
