#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/grant-admin.mjs <uid>");
  process.exit(1);
}

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

// Ensure required GCP environment variables for Workload Identity Federation
if (!process.env.GCP_SERVICE_ACCOUNT_EMAIL || !process.env.GCP_WORKLOAD_IDENTITY_PROVIDER) {
  console.error("Missing GCP_SERVICE_ACCOUNT_EMAIL or GCP_WORKLOAD_IDENTITY_PROVIDER environment variables.");
  process.exit(1);
}

// The GitHub Action should use google-github-actions/auth for authentication setup
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore(admin.app(), "kcm-db");

async function main() {
  try {
    const ref = db.doc(`users/${uid}`);
    await ref.set(
      {
        roles: FieldValue.arrayUnion("admin"),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Granted admin role to ${uid}`);
  } catch (err) {
    console.error("Failed to grant admin:");
    console.error(err.stack || err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Script failed unexpectedly:");
  console.error(err.stack || err.message);
  process.exit(1);
});
