"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { INITIAL_INVENTORY_ITEMS, INITIAL_TRANSACTION_LOGS } from "@/lib/mock-data";
import { INITIAL_CAMERA_RELOCATIONS, DEFAULT_ANNUAL_TARGET } from "@/lib/relocation-service";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Server,
  Boxes,
  Lock,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && (
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin"
      );
    }

    // Admin Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }

    // Inventory Items Collection (Public Read, Authenticated Write)
    match /inventory_items/{itemId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }

    // Transaction Audit Logs (Public Read, Authenticated Write)
    match /transaction_logs/{logId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    // Camera Relocations Collection (Public Read for TV Monitor, Authenticated Write)
    match /camera_relocations/{relocId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }

    // Camera Project Settings (Public Read for TV Monitor, Authenticated Write)
    match /project_settings/{settingId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }
  }
}`;

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@codsurv.com");
  const [password, setPassword] = useState("admin123456");
  const [isSeeding, setIsSeeding] = useState(false);
  const [stepStatus, setStepStatus] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [rulesCopied, setRulesCopied] = useState(false);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 3000);
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured || !auth || !db) {
      setError("Firebase is not properly configured. Check .env.local file.");
      return;
    }

    if (!email || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setIsSeeding(true);
      setError(null);
      setIsPermissionError(false);
      setStepStatus(["Connecting to Firebase project 'cod-serv-store-invetory'..."]);

      // 1. Authenticate or Create Admin User in Firebase Auth
      let adminUid = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        adminUid = userCredential.user.uid;
        setStepStatus((prev) => [...prev, `Admin account created in Firebase Auth (UID: ${adminUid.substring(0, 8)}...)`]);
      } catch (authErr: unknown) {
        const err = authErr as { code?: string; message?: string };
        if (err.code === "auth/email-already-in-use") {
          setStepStatus((prev) => [...prev, `Admin account (${email}) already exists in Firebase Auth. Signing in...`]);
          try {
            const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
            adminUid = cred.user.uid;
            setStepStatus((prev) => [...prev, `Signed in as admin (${adminUid.substring(0, 8)}...).`]);
          } catch (loginErr: unknown) {
            const lErr = loginErr as { code?: string; message?: string };
            throw new Error(
              `Admin user (${email}) already exists in Firebase Auth, but the password provided was incorrect. Please enter the password you previously created, or check Firebase Console.`
            );
          }
        } else {
          throw new Error(err.message || "Failed to create Firebase Auth user. Make sure Email/Password provider is enabled in Firebase Console.");
        }
      }

      // 2. Register Admin in Firestore 'users' collection (PRD §4)
      setStepStatus((prev) => [...prev, "Registering admin permissions in Firestore 'users' collection..."]);
      const userRef = doc(db, "users", adminUid);
      await setDoc(userRef, {
        uid: adminUid,
        email: email.trim(),
        role: "admin",
        createdAt: serverTimestamp(),
      });
      setStepStatus((prev) => [...prev, "Admin permissions registered in Firestore."]);

      // 3. Seed Initial CCTV & Hardware Inventory Items (PRD §3.2 & §4)
      setStepStatus((prev) => [...prev, "Seeding initial CCTV cameras, network devices, and cables..."]);
      for (const item of INITIAL_INVENTORY_ITEMS) {
        const itemRef = doc(db, "inventory_items", item.id);
        await setDoc(itemRef, {
          ...item,
          lastUpdated: serverTimestamp(),
        });
      }
      setStepStatus((prev) => [...prev, `Seeded ${INITIAL_INVENTORY_ITEMS.length} inventory products in 'inventory_items'.`]);

      // 4. Seed Initial Audit Logs (PRD §3.5 & §4)
      for (const log of INITIAL_TRANSACTION_LOGS) {
        const logRef = doc(db, "transaction_logs", log.id);
        await setDoc(logRef, {
          ...log,
          userEmail: email.trim(),
          timestamp: serverTimestamp(),
        });
      }
      setStepStatus((prev) => [...prev, `Seeded initial movement logs in 'transaction_logs'.`]);

      // 5. Seed Initial Camera Relocations & Annual Target (100 Cameras Project)
      setStepStatus((prev) => [...prev, "Setting up Annual 100 Camera Relocation project..."]);
      for (const reloc of INITIAL_CAMERA_RELOCATIONS) {
        const relocRef = doc(db, "camera_relocations", reloc.id);
        await setDoc(relocRef, {
          ...reloc,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      const settingsRef = doc(db, "project_settings", "camera_project");
      await setDoc(settingsRef, {
        annualTarget: DEFAULT_ANNUAL_TARGET,
        updatedAt: serverTimestamp(),
      });
      setStepStatus((prev) => [...prev, `Seeded ${INITIAL_CAMERA_RELOCATIONS.length} camera relocations and 100 quota target.`]);

      setIsCompleted(true);
      setStepStatus((prev) => [...prev, "Setup successfully finished! Ready for production use."]);

      // Auto redirect after 2.5s
      setTimeout(() => {
        router.push("/");
      }, 2500);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Initialization failed.";
      if (
        errMsg.toLowerCase().includes("permission") ||
        errMsg.toLowerCase().includes("missing or insufficient permissions")
      ) {
        setIsPermissionError(true);
        setError(
          "Firebase Firestore Security Rules are blocking writes. In Firebase Console, open Firestore Database -> Rules tab, paste the rules below, and click Publish."
        );
      } else {
        setError(errMsg);
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="glass-modal rounded-3xl p-7 sm:p-9 shadow-2xl border border-white/50 dark:border-white/10">
          {/* Header */}
          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md">
              <Sparkles className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Initialize Firebase Database
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                One-click database seeder for Cod Surv Store (PRD §3.1)
              </p>
            </div>
          </div>

          {/* Connected Firebase Project Card */}
          <div className="mb-6 p-3.5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Target Firebase Project:</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
              cod-serv-store-invetory (Spark Plan)
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Firestore Rules Helper Box when Permission Error Occurs */}
          {isPermissionError && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-xs space-y-3">
              <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                <span>Required Action: Publish Firestore Security Rules</span>
                <a
                  href="https://console.firebase.google.com/project/cod-serv-store-invetory/firestore/rules"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-normal"
                >
                  <span>Open Rules Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-amber-800/90 dark:text-amber-300/80 text-[11px] leading-relaxed">
                By default, new Firestore databases block all client writes. Copy the rules below and paste them into your Firebase Console Rules tab, then click <strong>Publish</strong>.
              </p>

              <div className="relative">
                <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-[10px] font-mono overflow-x-auto max-h-36">
                  {FIRESTORE_RULES_SNIPPET}
                </pre>
                <button
                  type="button"
                  onClick={handleCopyRules}
                  className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-medium transition-colors"
                >
                  {rulesCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Rules</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-amber-900 dark:text-amber-200 font-medium">
                After publishing the rules in Firebase Console, click the button below again!
              </div>
            </div>
          )}

          {/* Steps Progress Checklist */}
          {stepStatus.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/60 space-y-2 text-xs">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                Initialization Progress:
              </div>
              {stepStatus.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          )}

          {isCompleted ? (
            <div className="text-center py-4 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Initialization Complete!
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Redirecting to Inventory Dashboard in a moment...
              </p>
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleInitialize} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Admin Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Admin Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 block">
                  Must be at least 6 characters (used to log into Firebase Auth).
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSeeding}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSeeding ? (
                    "Initializing Database..."
                  ) : (
                    <>
                      <Boxes className="w-4 h-4" />
                      <span>Seed Admin & Initial Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Quick Note about Firebase Auth Console */}
          <div className="mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
            💡 <strong>Note:</strong> If you see &apos;Missing or insufficient permissions&apos;, publish the security rules in your{" "}
            <a
              href="https://console.firebase.google.com/project/cod-serv-store-invetory/firestore/rules"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>Firebase Firestore Rules Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
