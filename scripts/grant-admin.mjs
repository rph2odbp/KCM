#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/grant-admin.mjs <uid>");
  process.exit(1);
}

// Production: rely on ADC or service account JSON
const PROJECT_ID =
  process.env.FIREBASE_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

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
