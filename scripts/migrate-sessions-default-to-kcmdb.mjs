#!/usr/bin/env node
// Copy sessions from the default Firestore database to a named database (kcm-db by default).
// Usage:
//   PROJECT_ID=kcm-firebase-b7d6a DATABASE_ID=kcm-db node scripts/migrate-sessions-default-to-kcmdb.mjs
// Requires: Application Default Credentials with owner/editor on the project.

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;
if (!PROJECT_ID) {
  console.error(
    "Set PROJECT_ID to your GCP project (e.g., kcm-firebase-b7d6a)."
  );
  process.exit(1);
}
const DATABASE_ID =
  process.env.DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || "kcm-db";

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const dbDefault = getFirestore(admin.app());
const dbNamed = getFirestore(admin.app(), DATABASE_ID);

async function main() {
  console.log(`[migrate] Project: ${PROJECT_ID}`);
  console.log(`[migrate] From default DB -> to named DB: ${DATABASE_ID}`);

  const years = await dbDefault.collection("sessions").listDocuments();
  if (years.length === 0) {
    console.log(
      "[migrate] No years found under sessions/ in default DB. Nothing to do."
    );
    return;
  }
  let copied = 0;
  for (const y of years) {
    const year = y.id;
    for (const gender of ["boys", "girls"]) {
      const src = dbDefault.collection("sessions").doc(year).collection(gender);
      const dst = dbNamed.collection("sessions").doc(year).collection(gender);
      const snap = await src.get();
      if (snap.empty) continue;
      console.log(`[migrate] Year ${year}, ${gender}: ${snap.size} docs`);
      const batch = dbNamed.bulkWriter();
      let batchCount = 0;
      for (const doc of snap.docs) {
        batch.set(dst.doc(doc.id), doc.data(), { merge: true });
        copied++;
        batchCount++;
      }
      await batch.close();
      console.log(
        `[migrate] Wrote ${batchCount} docs to ${DATABASE_ID}/sessions/${year}/${gender}`
      );
    }
  }
  console.log(`[migrate] Completed. Total docs copied: ${copied}`);
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
