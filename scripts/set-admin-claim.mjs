#!/usr/bin/env node
/* eslint-disable no-console */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || "";
if (!PROJECT_ID) {
  console.error("FIREBASE_PROJECT_ID not set");
  process.exit(1);
}
const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/set-admin-claim.mjs <uid>");
  process.exit(1);
}
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let credential;
if (SA_PATH && fs.existsSync(SA_PATH))
  credential = cert(JSON.parse(fs.readFileSync(SA_PATH, "utf8")));
else credential = applicationDefault();
initializeApp({ projectId: PROJECT_ID, credential });
try {
  await getAuth().setCustomUserClaims(uid, { admin: true });
  console.log(`Set admin claim for uid=${uid}`);
  console.log("User must re-auth to refresh token.");
} catch (e) {
  console.error("Failed:", e);
  process.exit(1);
}
