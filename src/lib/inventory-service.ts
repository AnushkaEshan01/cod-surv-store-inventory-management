import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  runTransaction,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { InventoryItem, TransactionLog, TransactionType } from "@/types";
import { INITIAL_INVENTORY_ITEMS, INITIAL_TRANSACTION_LOGS } from "./mock-data";

const LOCAL_STORAGE_ITEMS_KEY = "cod_surv_inventory_items";
const LOCAL_STORAGE_LOGS_KEY = "cod_surv_transaction_logs";

// Helper for local mock storage
function getLocalItems(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Clean out legacy sample dummy items (item-1..10)
    return parsed.filter((it: InventoryItem) => !/^item-[1-9]$|^item-10$/.test(it.id));
  } catch {
    return [];
  }
}

function saveLocalItems(items: InventoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("inventory_updated", { detail: items }));
}

function getLocalLogs(): TransactionLog[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Clean out legacy sample dummy logs (log-1..5)
    return parsed.filter((l: TransactionLog) => !/^log-[1-5]$/.test(l.id));
  } catch {
    return [];
  }
}

function saveLocalLogs(logs: TransactionLog[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs));
  window.dispatchEvent(new CustomEvent("transactions_updated", { detail: logs }));
}

/**
 * Real-time Subscription to Inventory Items
 */
export function subscribeToInventory(
  onUpdate: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    try {
      const itemsCollection = collection(firestoreDb, "inventory_items");
      const q = query(itemsCollection, orderBy("itemName", "asc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: InventoryItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let lastUpdated = new Date().toISOString();
            if (data.lastUpdated instanceof Timestamp) {
              lastUpdated = data.lastUpdated.toDate().toISOString();
            } else if (data.lastUpdated) {
              lastUpdated = String(data.lastUpdated);
            }
            return {
              id: docSnap.id,
              itemName: data.itemName || "",
              category: data.category || "Other",
              quantity: Number(data.quantity) || 0,
              lowStockThreshold: Number(data.lowStockThreshold) || 5,
              lastUpdated,
              description: data.description || "",
              unit: data.unit || "units",
            };
          });
          onUpdate(items);
        },
        (error) => {
          console.error("Firestore onSnapshot error:", error);
          if (onError) onError(error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn("Firestore subscription failed, falling back to local storage:", e);
    }
  }

  // Fallback to local storage
  onUpdate(getLocalItems());
  const handler = (e: Event) => {
    const custom = e as CustomEvent<InventoryItem[]>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getLocalItems());
    }
  };
  window.addEventListener("inventory_updated", handler);
  return () => window.removeEventListener("inventory_updated", handler);
}

/**
 * Real-time Subscription to Transaction Logs (Audit Trail)
 */
export function subscribeToTransactions(
  onUpdate: (logs: TransactionLog[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    try {
      const logsCollection = collection(firestoreDb, "transaction_logs");
      const q = query(logsCollection, orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs: TransactionLog[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            let timestamp = new Date().toISOString();
            if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate().toISOString();
            } else if (data.timestamp) {
              timestamp = String(data.timestamp);
            }
            return {
              id: docSnap.id,
              itemId: data.itemId || "",
              itemName: data.itemName || "",
              transactionType: data.transactionType || "IN",
              amount: Number(data.amount) || 0,
              userEmail: data.userEmail || "admin@codsurv.com",
              timestamp,
              notes: data.notes || "",
            };
          });
          onUpdate(logs);
        },
        (error) => {
          console.error("Firestore transaction logs subscription error:", error);
          if (onError) onError(error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn("Firestore logs subscription failed, falling back to local storage:", e);
    }
  }

  // Fallback to local storage
  onUpdate(getLocalLogs());
  const handler = (e: Event) => {
    const custom = e as CustomEvent<TransactionLog[]>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getLocalLogs());
    }
  };
  window.addEventListener("transactions_updated", handler);
  return () => window.removeEventListener("transactions_updated", handler);
}

/**
 * Add New Inventory Item
 */
export async function addInventoryItem(
  item: Omit<InventoryItem, "id" | "lastUpdated">,
  userEmail: string
): Promise<string> {
  const now = new Date().toISOString();
  const id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    const itemRef = doc(collection(firestoreDb, "inventory_items"), id);
    await setDoc(itemRef, {
      ...item,
      id,
      lastUpdated: serverTimestamp(),
    });

    // Record initial IN transaction if quantity > 0
    if (item.quantity > 0) {
      const logRef = doc(collection(firestoreDb, "transaction_logs"));
      await setDoc(logRef, {
        id: logRef.id,
        itemId: id,
        itemName: item.itemName,
        transactionType: "IN",
        amount: item.quantity,
        userEmail,
        timestamp: serverTimestamp(),
        notes: "Initial inventory setup",
      });
    }
    return id;
  }

  // Local storage fallback
  const items = getLocalItems();
  const newItem: InventoryItem = {
    ...item,
    id,
    lastUpdated: now,
  };
  const updatedItems = [newItem, ...items];
  saveLocalItems(updatedItems);

  if (item.quantity > 0) {
    const logs = getLocalLogs();
    const newLog: TransactionLog = {
      id: `log-${Date.now()}`,
      itemId: id,
      itemName: item.itemName,
      transactionType: "IN",
      amount: item.quantity,
      userEmail,
      timestamp: now,
      notes: "Initial inventory setup",
    };
    saveLocalLogs([newLog, ...logs]);
  }

  return id;
}

/**
 * Update Existing Inventory Item Details
 */
export async function updateInventoryItem(
  id: string,
  updates: Partial<Omit<InventoryItem, "id" | "lastUpdated">>
): Promise<void> {
  const now = new Date().toISOString();

  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    const itemRef = doc(firestoreDb, "inventory_items", id);
    await updateDoc(itemRef, {
      ...updates,
      lastUpdated: serverTimestamp(),
    });
    return;
  }

  const items = getLocalItems();
  const index = items.findIndex((it) => it.id === id);
  if (index !== -1) {
    items[index] = {
      ...items[index],
      ...updates,
      lastUpdated: now,
    };
    saveLocalItems([...items]);
  }
}

/**
 * Delete Inventory Item
 */
export async function deleteInventoryItem(id: string): Promise<void> {
  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    const itemRef = doc(firestoreDb, "inventory_items", id);
    await deleteDoc(itemRef);
    return;
  }

  const items = getLocalItems();
  const filtered = items.filter((it) => it.id !== id);
  saveLocalItems(filtered);
}

/**
 * Stock In / Out Adjustment (Atomic with Transaction Audit Logging)
 */
export async function adjustStock(
  itemId: string,
  type: TransactionType,
  amount: number,
  userEmail: string,
  notes?: string
): Promise<{ success: boolean; newQuantity: number; error?: string }> {
  if (amount <= 0) {
    return { success: false, newQuantity: 0, error: "Adjustment quantity must be greater than 0" };
  }

  const now = new Date().toISOString();

  if (db && isFirebaseConfigured) {
    const firestoreDb = db;
    try {
      const itemRef = doc(firestoreDb, "inventory_items", itemId);
      let calculatedNewQty = 0;
      let targetItemName = "";

      await runTransaction(firestoreDb, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists()) {
          throw new Error("Item not found");
        }
        const data = itemDoc.data();
        const currentQty = Number(data.quantity) || 0;
        targetItemName = data.itemName || "Item";

        if (type === "OUT" && currentQty < amount) {
          throw new Error(`Insufficient stock. Current stock is ${currentQty}, cannot deduct ${amount}.`);
        }

        calculatedNewQty = type === "IN" ? currentQty + amount : currentQty - amount;

        transaction.update(itemRef, {
          quantity: calculatedNewQty,
          lastUpdated: serverTimestamp(),
        });

        const logRef = doc(collection(firestoreDb, "transaction_logs"));
        transaction.set(logRef, {
          id: logRef.id,
          itemId,
          itemName: targetItemName,
          transactionType: type,
          amount,
          userEmail,
          timestamp: serverTimestamp(),
          notes: notes || "",
        });
      });

      return { success: true, newQuantity: calculatedNewQty };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to adjust stock";
      return { success: false, newQuantity: 0, error: message };
    }
  }

  // Local storage transaction fallback
  const items = getLocalItems();
  const itemIndex = items.findIndex((it) => it.id === itemId);
  if (itemIndex === -1) {
    return { success: false, newQuantity: 0, error: "Item not found" };
  }

  const currentItem = items[itemIndex];
  if (type === "OUT" && currentItem.quantity < amount) {
    return {
      success: false,
      newQuantity: currentItem.quantity,
      error: `Insufficient stock. Current: ${currentItem.quantity}, cannot deduct ${amount}.`,
    };
  }

  const newQuantity = type === "IN" ? currentItem.quantity + amount : currentItem.quantity - amount;
  items[itemIndex] = {
    ...currentItem,
    quantity: newQuantity,
    lastUpdated: now,
  };
  saveLocalItems([...items]);

  const logs = getLocalLogs();
  const newLog: TransactionLog = {
    id: `log-${Date.now()}`,
    itemId,
    itemName: currentItem.itemName,
    transactionType: type,
    amount,
    userEmail,
    timestamp: now,
    notes: notes || "",
  };
  saveLocalLogs([newLog, ...logs]);

  return { success: true, newQuantity };
}

/**
 * Seed initial CCTV & networking dataset into Firestore if empty
 */
export async function seedInitialFirestoreData(): Promise<boolean> {
  if (!db || !isFirebaseConfigured) return false;
  const firestoreDb = db;

  for (const item of INITIAL_INVENTORY_ITEMS) {
    const itemRef = doc(firestoreDb, "inventory_items", item.id);
    await setDoc(itemRef, {
      ...item,
      lastUpdated: serverTimestamp(),
    });
  }

  for (const log of INITIAL_TRANSACTION_LOGS) {
    const logRef = doc(firestoreDb, "transaction_logs", log.id);
    await setDoc(logRef, {
      ...log,
      timestamp: serverTimestamp(),
    });
  }

  return true;
}
