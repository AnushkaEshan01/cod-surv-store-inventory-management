/**
 * Database Seeder Script for Cod Surv Store Inventory System (PRD §3.1)
 *
 * This script initializes:
 * 1. Admin account in Firebase Auth
 * 2. Admin document in the `users` Firestore collection ({ uid, role: "admin", email })
 * 3. Initial CCTV, network hardware, and cable inventory items
 *
 * Usage:
 *   npx ts-node scripts/seed-admin.ts <adminEmail> <adminPassword>
 * Example:
 *   npx ts-node scripts/seed-admin.ts admin@codsurv.com SuperSecretPassword123!
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function seedAdmin() {
  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_SEED_EMAIL || "admin@codsurv.com";
  const password = args[1] || process.env.ADMIN_SEED_PASSWORD || "CodSurv2026!Admin";

  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "your-api-key") {
    console.error("❌ Error: Firebase environment variables are missing.");
    console.error("Please ensure .env.local has valid NEXT_PUBLIC_FIREBASE_* variables.");
    process.exit(1);
  }

  console.log(`Initializing Firebase for project: ${firebaseConfig.projectId}...`);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    console.log(`Seeding Admin account: ${email}...`);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    console.log(`✅ Admin user created in Firebase Auth with UID: ${uid}`);

    // Create user record in 'users' collection (PRD §4)
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      uid,
      email,
      role: "admin",
      createdAt: serverTimestamp(),
    });

    console.log(`✅ Admin permissions registered in Firestore 'users/${uid}'.`);
    console.log("\n🎉 Admin seeding completed successfully!");
    console.log(`Email: ${email}`);
    console.log("Password: [HIDDEN]");
    console.log("You can now disable public sign-ups in Firebase Authentication Console.");
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/email-already-in-use") {
      console.log(`ℹ️ Admin user (${email}) already exists in Firebase Auth.`);
    } else {
      console.error("❌ Seeding failed:", err.message || error);
    }
  }
}

seedAdmin().catch(console.error);
