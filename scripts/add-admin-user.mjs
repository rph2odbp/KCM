#!/usr/bin/env node
/* eslint-disable no-console */
// Create an Auth emulator user and ensure Firestore users/{uid} with roles, including admin
const email = (process.argv[2] || "").toLowerCase();
const password = process.argv[3] || "password";
if (!email) {
  console.error("Usage: node scripts/add-admin-user.mjs <email> [password]");
  process.exit(1);
}

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9110";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8088";
const PROJECT_ID = process.env.FIREBASE_PROJECT || "demo-project";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "kcm-db";

async function signup(email, password) {
  const url = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await res.json();
  if (body && body.error && body.error.message === "EMAIL_EXISTS") {
    // Try sign-in to get uid
    const signInUrl = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`;
    const r2 = await fetch(signInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const b2 = await r2.json();
    if (!r2.ok) throw new Error(`Sign-in failed: ${JSON.stringify(b2)}`);
    return b2.localId;
  }
  if (!res.ok) throw new Error(`Sign-up failed: ${JSON.stringify(body)}`);
  return body.localId;
}

async function writeProfile(uid, email) {
  const path = `http://${FS_HOST}/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${uid}?documentId=${uid}`;
  const doc = {
    fields: {
      email: { stringValue: email },
      displayName: { stringValue: "Emulator Admin" },
      roles: {
        arrayValue: {
          values: [
            { stringValue: "parent" },
            { stringValue: "staff" },
            { stringValue: "admin" },
          ],
        },
      },
    },
  };
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      `Write profile failed: ${res.status} ${JSON.stringify(body)}`
    );
}

async function main() {
  const uid = await signup(email, password);
  await writeProfile(uid, email);
  console.log(
    `Created/updated user ${email} as admin (uid: ${uid}) in emulator.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
