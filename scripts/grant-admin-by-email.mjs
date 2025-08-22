#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Require email as input argument
const emailArg = (process.argv[2] || "").toLowerCase();
if (!emailArg) {
  console.error("Usage: node scripts/grant-admin-by-email.mjs <email>");
  process.exit(1);
}
console.log("[grant-admin] Using production APIs");

const PROJECT_ID =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

// Workload Identity Federation via GOOGLE_APPLICATION_CREDENTIALS is assumed to be set in CI
if (!process.env.GCP_SERVICE_ACCOUNT_EMAIL || !process.env.GCP_WORKLOAD_IDENTITY_PROVIDER) {
  console.error("Missing GCP_SERVICE_ACCOUNT_EMAIL or GCP_WORKLOAD_IDENTITY_PROVIDER environment variables.");
  process.exit(1);
}

// Note: The GitHub Action should use google-github-actions/auth to set up federation and GOOGLE_APPLICATION_CREDENTIALS
if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = getFirestore(admin.app(), "kcm-db");
const auth = admin.auth();

async function main() {
  let matchedDocs = [];
  try {
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
        console.error("Tip: sign in once with this email in the app to create the account/profile, then re-run.");
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
