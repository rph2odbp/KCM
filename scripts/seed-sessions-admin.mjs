#!/usr/bin/env node
/* eslint-disable no-console */
// Clean seeding script for 2026 (or specified year) camp sessions.
// Usage:
//   node scripts/seed-sessions-admin.mjs            # seeds default year 2026
//   node scripts/seed-sessions-admin.mjs 2025       # seeds 2025 (generic sample)
//   YEAR=2027 node scripts/seed-sessions-admin.mjs  # via env

import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Resolve configuration / environment
const ARG_YEAR =
  process.argv[2] && /^(\d{4})$/.test(process.argv[2])
    ? Number(process.argv[2])
    : undefined;
const YEAR = Number(process.env.YEAR || ARG_YEAR || 2026);
const PROJECT_ID =
  process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || "demo-project";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";
const FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088";

// Force emulator usage if host appears to be local
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}
// Multi-database aware Firestore reference
const db = getFirestore(undefined, DATABASE_ID);
db.settings({ ignoreUndefinedProperties: true });

// Canonical 2026 schedule (authoritative); for other years create a trimmed sample.
function buildSessions(year) {
  if (year === 2026) {
    return [
      {
        gender: "boys",
        id: "boys-w1",
        name: "Boys Camp Week 1",
        start: "2026-05-31",
        end: "2026-06-06",
        cap: 210,
      },
      {
        gender: "boys",
        id: "boys-w2",
        name: "Boys Camp Week 2",
        start: "2026-06-07",
        end: "2026-06-13",
        cap: 210,
      },
      {
        gender: "boys",
        id: "boys-w3",
        name: "Boys Camp Week 3",
        start: "2026-06-14",
        end: "2026-06-20",
        cap: 210,
      },
      {
        gender: "boys",
        id: "boys-w4",
        name: "Boys Camp Week 4",
        start: "2026-06-21",
        end: "2026-06-27",
        cap: 210,
      },
      {
        gender: "girls",
        id: "girls-w1",
        name: "Girls Camp Week 1",
        start: "2026-06-28",
        end: "2026-07-04",
        cap: 210,
      },
      {
        gender: "girls",
        id: "girls-w2",
        name: "Girls Camp Week 2",
        start: "2026-07-05",
        end: "2026-07-11",
        cap: 210,
      },
      {
        gender: "girls",
        id: "girls-w3",
        name: "Girls Camp Week 3",
        start: "2026-07-12",
        end: "2026-07-18",
        cap: 210,
      },
      {
        gender: "girls",
        id: "girls-w4",
        name: "Girls Camp Week 4",
        start: "2026-07-19",
        end: "2026-07-25",
        cap: 210,
      },
    ];
  }
  // Generic minimal sample for non-2026 years
  return [
    {
      gender: "boys",
      id: `boys-w1`,
      name: `Boys Week 1 ${year}`,
      start: `${year}-07-07`,
      end: `${year}-07-13`,
      cap: 120,
    },
    {
      gender: "girls",
      id: `girls-w1`,
      name: `Girls Week 1 ${year}`,
      start: `${year}-07-14`,
      end: `${year}-07-20`,
      cap: 120,
    },
  ];
}

const sessions = buildSessions(YEAR);

async function upsertSessions() {
  let committed = 0;
  // Use batched writes in chunks of 400 (well below 500 limit) for future scalability
  for (let i = 0; i < sessions.length; i += 400) {
    const batch = db.batch();
    for (const s of sessions.slice(i, i + 400)) {
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
          capacity: s.cap,
          price: 0,
          waitlistOpen: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    committed += Math.min(400, sessions.length - i);
  }
  return committed;
}

async function main() {
  console.log("[seed] Project:", PROJECT_ID);
  console.log("[seed] Database:", DATABASE_ID);
  console.log("[seed] Year:", YEAR);
  console.log("[seed] Sessions to upsert:", sessions.length);

  const count = await upsertSessions();
  for (const s of sessions) {
    console.log(`[seed] Upserted ${YEAR}/${s.gender}/${s.id}`);
  }
  console.log(`[seed] Completed: ${count} session docs written.`);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
