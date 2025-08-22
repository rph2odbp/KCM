#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

const emailArg = (process.argv[2] || "").toLowerCase();
if (!emailArg) {
  console.error("Usage: node scripts/grant-admin-by-email.mjs <email>");
  process.exit(1);
}

console.log("[grant-admin] Using production APIs");
const PROJECT_ID =
  process.env.FIREBASE_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

// Credential setup
let options = { projectId: PROJECT_ID };
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // Inline JSON from env
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    options.credential = admin.credential.cert(parsed);
    console.log("[grant-admin] Using inline service account JSON");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Path to JSON file
    const loaded = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
    options.credential = admin.credential.cert(loaded);
    console.log("[grant-admin] Using service account from path");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // GOOGLE_APPLICATION_CREDENTIALS is set, so admin SDK will pick it up automatically
    console.log("[grant-admin] Using GOOGLE_APPLICATION_CREDENTIALS env");
  } else {
    console.log("[grant-admin] Relying on Application Default Credentials");
  }
} catch (e) {
  console.warn("[grant-admin] Failed to parse service account credentials, falling back to ADC:", e.message);
}
if (!admin.apps.length) {
  admin.initializeApp(options);
}

// Firestore database (ensure named database for emulator/prod parity)
const db = getFirestore(admin.app(), "kcm-db");
const auth = admin.auth();

async function main() {
  // Look up user profile by email
  let matchedDocs = [];
  // Try to find Firestore user
  const q = await db.collection("users").where("email", "==", emailArg).get();
  if (!q.empty) {
    matchedDocs = q.docs.map(doc => ({ id: doc.id, ref: doc.ref }));
  } else {
    // Try to find Auth user and create Firestore doc if needed
    try {
      const user = await auth.getUserByEmail(emailArg);
      const ref = db.doc(`users/${user.uid}`);
      await ref.set(
        {
          email: emailArg,
          displayName: user.displayName || "",
          isActive: true,
        },
        { merge: true }
      );
      matchedDocs = [{ id: user.uid, ref }];
    } catch (e) {
      console.error("No user found with email in Firestore or Auth:", emailArg);
      console.error(
        "Tip: sign in once with this email in the app to create the account/profile, then re-run."
      );
      process.exit(2);
    }
  }
  // Grant admin role
  for (const d of matchedDocs) {
    await d.ref.set(
      {
        roles: FieldValue.arrayUnion("admin"),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Granted admin role to ${emailArg} (uid: ${d.id})`);
  }
}

main().catch((err) => {
  console.error("Failed to grant admin:", err);
  process.exit(1);
});
