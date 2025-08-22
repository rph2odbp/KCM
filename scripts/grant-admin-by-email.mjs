#!/usr/bin/env node
/* eslint-disable no-console */
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const emailArg = (process.argv[2] || "").toLowerCase();
if (!emailArg) {
  console.error("Usage: node scripts/grant-admin-by-email.mjs <email>");
  process.exit(1);
}

// Production: rely on ADC (gcloud auth application-default login) or service account JSON (GOOGLE_APPLICATION_CREDENTIALS)
console.log("[grant-admin] Using production APIs");
const PROJECT_ID =
  process.env.FIREBASE_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "kcm-firebase-b7d6a";

if (!admin.apps.length) {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let options = { projectId: PROJECT_ID };
  try {
    if (saJson) {
      const parsed = JSON.parse(saJson);
      options = {
        credential: admin.credential.cert(parsed),
        projectId: PROJECT_ID,
      };
      console.log("[grant-admin] Using inline service account JSON");
    } else if (saPath) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const loaded = JSON.parse(require("fs").readFileSync(saPath, "utf8"));
      options = {
        credential: admin.credential.cert(loaded),
        projectId: PROJECT_ID,
      };
      console.log("[grant-admin] Using service account from path");
    }
  } catch (e) {
    console.warn(
      "[grant-admin] Failed to parse provided service account credentials, falling back to ADC:",
      e.message
    );
  }
  admin.initializeApp(options);
}
// Use the named Firestore database (kcm-db) to match the app and emulator seeding
const db = getFirestore(admin.app(), "kcm-db");
const auth = admin.auth();

async function main() {
  // Look up user profile by email
  let matchedDocs = [];
  const q = await db.collection("users").where("email", "==", emailArg).get();
  if (!q.empty) {
    matchedDocs = q.docs;
  } else {
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
