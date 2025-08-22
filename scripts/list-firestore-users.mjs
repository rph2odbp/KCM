#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";

const limit = Math.max(1, Number(process.argv[2] || 50));
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";

async function initAdmin() {
  if (admin.apps.length) return;
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const credential = {
    getAccessToken: async () => {
      const res = await client.getAccessToken();
      const token = typeof res === "string" ? res : res?.token;
      if (!token) throw new Error("Failed to obtain access token via ADC");
      return { access_token: token, expires_in: 300 };
    },
  };
  admin.initializeApp({ credential, projectId: PROJECT_ID });
}

async function main() {
  await initAdmin();
  const db = getFirestore(admin.app(), DATABASE_ID);
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
