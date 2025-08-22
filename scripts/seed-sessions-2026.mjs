#!/usr/bin/env node
/* eslint-disable no-console */
// Idempotently seed the authoritative 2026 sessions (8 total) into Firestore.
// Uses ADC (Workload Identity / gcloud application-default) or provided SA.
// Usage examples:
//   node scripts/seed-sessions-2026.mjs
//   PROJECT_ID=kcm-firebase-b7d6a DATABASE_ID=kcm-db node scripts/seed-sessions-2026.mjs
// In CI with WIF: set PROJECT_ID via env and run this script after auth.

import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID =
  process.env.PROJECT_ID ||
  process.env.FIREBASE_PROJECT ||
  "kcm-firebase-b7d6a";
const DATABASE_ID =
  process.env.DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || "kcm-db";

// Optional service account via env (not required when using ADC/WIF)
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
    console.log("[seed-2026] Using inline service account JSON");
  } else if (saPath) {
    const fs = await import("node:fs");
    const loaded = JSON.parse(fs.readFileSync(saPath, "utf8"));
    options = {
      credential: admin.credential.cert(loaded),
      projectId: PROJECT_ID,
    };
    console.log("[seed-2026] Using service account from path");
  }
} catch (e) {
  console.warn(
    "[seed-2026] Failed to parse SA; falling back to ADC:",
    e.message
  );
}

if (!admin.apps.length) admin.initializeApp(options);
const db = getFirestore(admin.app(), DATABASE_ID);

const YEAR = 2026;
const sessions = [
  {
    gender: "boys",
    id: "boys-w1",
    name: "Boys Camp Week 1",
    start: "2026-05-31",
    end: "2026-06-06",
  },
  {
    gender: "boys",
    id: "boys-w2",
    name: "Boys Camp Week 2",
    start: "2026-06-07",
    end: "2026-06-13",
  },
  {
    gender: "boys",
    id: "boys-w3",
    name: "Boys Camp Week 3",
    start: "2026-06-14",
    end: "2026-06-20",
  },
  {
    gender: "boys",
    id: "boys-w4",
    name: "Boys Camp Week 4",
    start: "2026-06-21",
    end: "2026-06-27",
  },
  {
    gender: "girls",
    id: "girls-w1",
    name: "Girls Camp Week 1",
    start: "2026-06-28",
    end: "2026-07-04",
  },
  {
    gender: "girls",
    id: "girls-w2",
    name: "Girls Camp Week 2",
    start: "2026-07-05",
    end: "2026-07-11",
  },
  {
    gender: "girls",
    id: "girls-w3",
    name: "Girls Camp Week 3",
    start: "2026-07-12",
    end: "2026-07-18",
  },
  {
    gender: "girls",
    id: "girls-w4",
    name: "Girls Camp Week 4",
    start: "2026-07-19",
    end: "2026-07-25",
  },
];

async function upsertAll() {
  let written = 0;
  const batch = db.batch();
  for (const s of sessions) {
    const ref = db
      .collection("sessions")
      .doc(String(YEAR))
      .collection(s.gender)
      .doc(s.id);
    batch.set(
      ref,
      {
        id: s.id,
        year: YEAR,
        name: s.name,
        gender: s.gender,
        startDate: s.start,
        endDate: s.end,
        capacity: 210,
        price: 0,
        waitlistOpen: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    written++;
  }
  await batch.commit();
  return written;
}

(async () => {
  console.log("[seed-2026] Project:", PROJECT_ID, "Database:", DATABASE_ID);
  const count = await upsertAll();
  console.log(`[seed-2026] Upserted ${count} sessions for ${YEAR}.`);
})().catch((err) => {
  console.error("[seed-2026] Failed:", err);
  process.exit(1);
});
