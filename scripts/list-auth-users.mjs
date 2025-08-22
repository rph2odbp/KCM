#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { GoogleAuth } from "google-auth-library";

const limit = Math.max(1, Number(process.argv[2] || 50));
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

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
  let nextPageToken = undefined;
  let count = 0;
  console.log(`[auth] Listing up to ${limit} users...`);
  do {
    const res = await admin.auth().listUsers(1000, nextPageToken);
    for (const u of res.users) {
      console.log(
        `${u.uid}\t${u.email || "<no-email>"}\t${u.displayName || ""}`
      );
      count++;
      if (count >= limit) return;
    }
    nextPageToken = res.pageToken;
  } while (nextPageToken && count < limit);
  console.log(`[auth] Done. Listed ${count} users.`);
}

main().catch((e) => {
  console.error("[auth] Failed to list users:");
  console.error(e.stack || e.message);
  process.exit(1);
});
