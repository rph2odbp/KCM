#!/usr/bin/env node
/* eslint-disable no-console */
// Idempotent production seeding script.
// Responsibilities:
// 1. Ensure base admin user exists with admin role.
// 2. Ensure reference session documents exist (if desired) without overwriting existing.
// 3. Safe to run multiple times.
// Usage:
//   node scripts/seed-production.mjs <adminEmail> [year]
// Example:
//   node scripts/seed-production.mjs you@example.com 2026

import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [adminEmailArg, yearArg] = process.argv.slice(2);
if (!adminEmailArg) {
  console.error("Usage: node scripts/seed-production.mjs <adminEmail> [year]");
  process.exit(1);
}

const PROJECT_ID = process.env.FIREBASE_PROJECT || "kcm-firebase-b7d6a";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore(admin.app(), DATABASE_ID);

async function ensureAdminUser(email) {
  // Try Auth first
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email.toLowerCase());
  } catch (e) {
    console.error(
      `Auth user for ${email} not found. Ask user to sign up via UI first.`
    );
    return null; // Don't create arbitrary auth users in prod; manual sign-in required
  }
  const userDocRef = db.doc(`users/${userRecord.uid}`);
  const snap = await userDocRef.get();
  if (!snap.exists) {
    await userDocRef.set({
      email: email.toLowerCase(),
      displayName: userRecord.displayName || "",
      roles: ["admin"],
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`[seed] Created admin user profile for ${email}`);
  } else {
    const data = snap.data() || {};
    const roles = Array.isArray(data.roles) ? data.roles : [];
    if (!roles.includes("admin")) {
      await userDocRef.set(
        {
          roles: FieldValue.arrayUnion("admin"),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[seed] Added admin role to existing user ${email}`);
    } else {
      console.log(`[seed] Admin role already present for ${email}`);
    }
  }
  return userRecord.uid;
}

async function ensureSessionSkeleton(year) {
  if (!year) return;
  const genders = ["boys", "girls"];
  for (const g of genders) {
    const ref = db.doc(`sessions/${year}/${g}/placeholder`);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        name: `${year} ${g} placeholder`,
        capacity: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`[seed] Created sessions/${year}/${g}/placeholder`);
    }
  }
}

async function main() {
  const uid = await ensureAdminUser(adminEmailArg);
  if (!uid) {
    console.warn("[seed] Skipping session skeleton; admin user not ensured.");
  }
  await ensureSessionSkeleton(yearArg);
  console.log("[seed] Done.");
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
