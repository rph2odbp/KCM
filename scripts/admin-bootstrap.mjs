#!/usr/bin/env node
/* eslint-disable no-console */
// Unified admin bootstrap utility.
// Provides clearer diagnostics for missing credentials and chains common tasks.
// Usage examples:
//   node scripts/admin-bootstrap.mjs grant-admin you@example.com
//   node scripts/admin-bootstrap.mjs seed you@example.com 2026
//   FIREBASE_SERVICE_ACCOUNT_PATH=./sa.json node scripts/admin-bootstrap.mjs grant-admin you@example.com
//   # Emulator mode is no longer supported

import { readFileSync } from "fs";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [command, emailArgRaw, yearArg] = process.argv.slice(2);
if (!command || !["grant-admin", "seed"].includes(command)) {
  console.error(
    "Usage: node scripts/admin-bootstrap.mjs <grant-admin|seed> <email> [year]"
  );
  process.exit(1);
}
if (!emailArgRaw) {
  console.error("Email required");
  process.exit(1);
}

const emailArg = emailArgRaw.toLowerCase();
const PROJECT_ID =
  process.env.FIREBASE_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "kcm-firebase-b7d6a";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";

function loadCredentialOptions() {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    try {
      const parsed = JSON.parse(saJson);
      console.log("[bootstrap] Using inline service account JSON");
      return {
        credential: admin.credential.cert(parsed),
        projectId: PROJECT_ID,
      };
    } catch (e) {
      console.error(
        "[bootstrap] Failed parsing FIREBASE_SERVICE_ACCOUNT_JSON:",
        e.message
      );
      process.exit(2);
    }
  }
  if (saPath) {
    try {
      const parsed = JSON.parse(readFileSync(saPath, "utf8"));
      console.log("[bootstrap] Using service account file at", saPath);
      return {
        credential: admin.credential.cert(parsed),
        projectId: PROJECT_ID,
      };
    } catch (e) {
      console.error(
        "[bootstrap] Failed reading service account file:",
        e.message
      );
      process.exit(2);
    }
  }
  // No explicit creds. Warn before proceeding (will likely fail if not on GCP).
  console.warn(
    "[bootstrap] No service account creds provided. Will rely on Application Default Credentials."
  );
  console.warn("  Provide one of:");
  console.warn("   - FIREBASE_SERVICE_ACCOUNT_PATH=path/to/key.json");
  console.warn('   - FIREBASE_SERVICE_ACCOUNT_JSON="$(cat key.json)"');
  return { projectId: PROJECT_ID };
}

if (!admin.apps.length) {
  admin.initializeApp(loadCredentialOptions());
}
const db = getFirestore(admin.app(), DATABASE_ID);
const auth = admin.auth();

async function grantAdmin(email) {
  // Ensure Auth user exists
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (e) {
    console.error(
      "[grant-admin] Auth user not found. Have they signed in via the app yet?"
    );
    process.exit(3);
  }
  const ref = db.doc(`users/${user.uid}`);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email,
      roles: ["admin"],
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("[grant-admin] Created profile with admin role");
  } else {
    await ref.set(
      {
        roles: FieldValue.arrayUnion("admin"),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log("[grant-admin] Ensured admin role on existing profile");
  }
}

async function seed(email, year) {
  await grantAdmin(email);
  if (year) {
    for (const g of ["boys", "girls"]) {
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
  console.log("[seed] Done");
}

async function main() {
  if (command === "grant-admin") return grantAdmin(emailArg);
  if (command === "seed") return seed(emailArg, yearArg);
}

main().catch((err) => {
  console.error("[bootstrap] Failed:", err);
  process.exit(1);
});
