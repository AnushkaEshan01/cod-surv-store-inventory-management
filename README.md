# Cod Surv Store Inventory System

> A lightweight, zero-cost, serverless inventory management web application for CCTV cameras, network devices, cables, and hardware. Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase Cloud Firestore**. Featuring an **Apple-style minimalist design** with glassmorphism and translucency effects.

---

## ✨ Features & Architecture

### 1. Apple-Style Minimalist UI
- **Translucency & Glassmorphism:** Frosted blur glass cards (`backdrop-blur-xl`), subtle borders, soft shadows, and clean typography.
- **Dynamic Status Highlighting:**
  - 🟢 **In Stock:** Subtle emerald status pill.
  - 🟠 **Low Stock:** Amber highlight row and warning badge when quantity $\le$ predefined threshold.
  - 🔴 **Out of Stock:** Red highlight row and explicit *Out of Stock* indicator when quantity is 0.
- **List-Based Inventory Dashboard:** Tabular, clean view without heavy product images for fast loading and maximum simplicity.

### 2. Core Functional Modules
- **Authentication & Admin Only Access:** Restricted to a single administrator; public sign-ups disabled.
- **Product Management (CRUD):** Add, edit, and delete products (with name, category, initial quantity, low-stock threshold, units, specs).
- **Atomic Stock In / Out Operations:** Quick action buttons (`+ In` / `- Out`) directly in table rows with quantity adjustments and notes.
- **Transaction Audit Log (Ledger):** Immutable ledger recording Item Name, Action (`IN` or `OUT`), Quantity Changed, Timestamp, and Admin User.
- **Reporting & Client-Side Export:**
  - Weekly stock health distribution and category share.
  - Client-side **PDF summary reports** with formatted tables.
  - Client-side **CSV export** for inventory and transaction logs without requiring server processing.

### 3. Dual-Mode Architecture (Zero-Config Preview & Live Firebase)
- **Demo Sandbox Mode:** Runs instantly out of the box with realistic CCTV/network sample hardware and transaction history.
- **Live Firebase Mode:** Automatically activated when Firebase credentials are configured in `.env.local`.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install --ignore-scripts --legacy-peer-deps
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Firebase Setup (Production)

1. Create a project on the [Firebase Console](https://console.firebase.google.com/) (Spark Free Plan).
2. Enable **Cloud Firestore** and **Firebase Authentication** (Email/Password provider).
3. Copy `.env.example` to `.env.local` and paste your project credentials:
```bash
cp .env.example .env.local
```
4. Run the admin seeder script to initialize the single admin user:
```bash
npx ts-node scripts/seed-admin.ts admin@codsurv.com YourSecurePassword123!
```
5. Deploy Firestore Security Rules:
```bash
firebase deploy --only firestore:rules
```

---

## 📂 Project Structure

```
cod-surv-inventory/
├── firestore.rules          # PRD §5 Firestore Security Rules
├── scripts/
│   └── seed-admin.ts        # PRD §3.1 Database Seeder Script
├── src/
│   ├── app/
│   │   ├── globals.css      # Apple glassmorphism & typography
│   │   ├── layout.tsx       # Root layout with AuthProvider & Apple shell
│   │   ├── page.tsx         # Main Inventory Dashboard
│   │   ├── login/page.tsx   # Minimalist Admin Login
│   │   ├── transactions/page.tsx # Audit Log Ledger
│   │   └── reports/page.tsx # Weekly Reports & PDF/CSV Exporter
│   ├── components/
│   │   ├── Header.tsx       # Glassmorphic top navigation
│   │   ├── StatCards.tsx    # KPI overview cards
│   │   ├── InventoryTable.tsx # Tabular list-based view with quick actions
│   │   ├── ProductModal.tsx # Add/Edit modal
│   │   ├── StockActionModal.tsx # Quick IN/OUT stock modal
│   │   └── DeleteConfirmModal.tsx # Delete confirmation
│   ├── lib/
│   │   ├── auth-context.tsx # Single Admin Authentication Context
│   │   ├── export-utils.ts  # Client-side PDF & CSV generation
│   │   ├── firebase.ts      # Firebase SDK client initialization
│   │   ├── inventory-service.ts # Firestore CRUD & atomic transactions
│   │   ├── mock-data.ts     # Sample CCTV & network hardware items
│   │   └── utils.ts         # Tailwind helper
│   └── types/
│       └── index.ts         # TypeScript data schema
```
