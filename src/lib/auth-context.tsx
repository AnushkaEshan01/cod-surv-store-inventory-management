"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";
import { AppUser } from "@/types";
import { DEFAULT_ADMIN } from "./mock-data";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  isAdmin: false,
});

const DEMO_USER_STORAGE_KEY = "cod_surv_auth_demo_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isDemo = !isFirebaseConfigured;

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email || "admin@codsurv.com",
            role: "admin",
            displayName: fbUser.displayName || "Admin User",
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // In demo mode, restore state or default to logged in admin
      const stored = typeof window !== "undefined" ? localStorage.getItem(DEMO_USER_STORAGE_KEY) : null;
      if (stored === "logged-out") {
        setUser(null);
      } else {
        setUser(DEFAULT_ADMIN);
      }
      setLoading(false);
    }
  }, [isDemo]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email || email,
          role: "admin",
          displayName: cred.user.displayName || "Admin User",
        });
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to sign in with Firebase";
        return { success: false, error: message };
      }
    }

    // Demo Mode validation
    if (email.trim().toLowerCase() === "admin@codsurv.com" && pass.length >= 6) {
      const demoUser: AppUser = {
        ...DEFAULT_ADMIN,
        email: email.trim().toLowerCase(),
      };
      setUser(demoUser);
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      }
      return { success: true };
    }

    if (pass.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" };
    }

    // Allow flexible test admin logins in demo mode
    const customUser: AppUser = {
      uid: `admin-${Date.now()}`,
      email: email.trim().toLowerCase(),
      role: "admin",
      displayName: "Store Administrator",
    };
    setUser(customUser);
    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    }
    return { success: true };
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_USER_STORAGE_KEY, "logged-out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemo,
        login,
        logout,
        isAdmin: Boolean(user && user.role === "admin"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
