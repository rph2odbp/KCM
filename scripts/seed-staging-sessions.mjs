#!/usr/bin/env node
/* eslint-disable no-console */
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "node:fs";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT || "";
if (!PROJECT_ID) {
  console.error("FIREBASE_PROJECT_ID not set");
  process.exit(1);
}
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let credential;
if (SA_PATH && fs.existsSync(SA_PATH))
  credential = cert(JSON.parse(fs.readFileSync(SA_PATH, "utf8")));
else credential = applicationDefault();

initializeApp({ projectId: PROJECT_ID, credential });
const db = getFirestore();
const year = parseInt(process.argv[2] || `${new Date().getFullYear() + 1}`);
const boys = [
  {
    id: "boys-w1",
    name: "Boys Week 1",
    startDate: `${year}-06-09`,
    endDate: `${year}-06-14`,
    capacity: 210,
    price: 0,
    waitlistOpen: true,
  },
  {
    id: "boys-w2",
    name: "Boys Week 2",
    startDate: `${year}-06-16`,
    endDate: `${year}-06-21`,
    capacity: 210,
    price: 0,
    waitlistOpen: true,
  },
];
const girls = [
  {
    id: "girls-w1",
    name: "Girls Week 1",
    startDate: `${year}-07-07`,
    endDate: `${year}-07-12`,
    capacity: 210,
    price: 0,
    waitlistOpen: true,
  },
];
async function upsert(list, gender) {
  const batch = db.batch();
  for (const s of list) {
    const ref = db.doc(`sessions/${year}/${gender}/${s.id}`);
    batch.set(
      ref,
      {
        ...s,
        year,
        gender,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();
  console.log(`Seeded ${gender} sessions (${list.length}) for ${year}`);
}
await upsert(boys, "boys");
await upsert(girls, "girls");
console.log("Done.");
