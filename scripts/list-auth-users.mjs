#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";

const limit = Math.max(1, Number(process.argv[2] || 50));
const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

async function initAdmin() {
  if (admin.apps.length) return;
  // Rely on ADC (GOOGLE_APPLICATION_CREDENTIALS) provided by GitHub Actions WIF.
  // Project is propagated via GCLOUD_PROJECT env.
  admin.initializeApp({ projectId: PROJECT_ID });
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
