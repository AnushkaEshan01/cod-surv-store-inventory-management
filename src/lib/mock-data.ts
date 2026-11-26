import { InventoryItem, TransactionLog } from "@/types";

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [];

export const INITIAL_TRANSACTION_LOGS: TransactionLog[] = [];

export const DEFAULT_ADMIN = {
  uid: "admin-master-uid-001",
  email: "admin@codsurv.com",
  role: "admin" as const,
  displayName: "Cod Surv Administrator",
};
