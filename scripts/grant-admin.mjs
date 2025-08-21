#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/grant-admin.mjs <uid>");
  process.exit(1);
}

// Point Admin SDK to emulators
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9110";
const PROJECT_ID = process.env.FIREBASE_PROJECT || "demo-project";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore(admin.app(), "kcm-db");

async function main() {
  const ref = db.doc(`users/${uid}`);
  await ref.set(
    {
      roles: FieldValue.arrayUnion("admin"),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Granted admin role to ${uid}`);
}

main().catch((err) => {
  console.error("Failed to grant admin:", err);
  process.exit(1);
});
