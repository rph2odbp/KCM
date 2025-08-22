#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const limit = Math.max(1, Number(process.argv[2] || 50));
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
const db = getFirestore(admin.app(), DATABASE_ID);

async function main() {
  console.log(
    `[firestore:${DATABASE_ID}] Listing up to ${limit} documents from users collection...`
  );
  const snap = await db.collection("users").limit(limit).get();
  if (snap.empty) {
    console.log("<no-docs>");
    return;
  }
  for (const d of snap.docs) {
    const data = d.data();
    console.log(
      `${d.id}\t${data.email || "<no-email>"}\t${(data.roles || []).join(",")}`
    );
  }
}

main().catch((e) => {
  console.error("[firestore] Failed to list users:");
  console.error(e.stack || e.message);
  process.exit(1);
});
