// Minimal emulator smoke: Firestore REST writes only
// Note: The helloWorld HTTPS function is private in prod; to keep the smoke robust,
// we only exercise Firestore via the emulator's REST API.
// Requires: firebase emulators:exec --only functions,firestore --project kcm-firebase-b7d6a -- node scripts/emulator-smoke.js
const PROJECT_ID = process.env.FB_PROJECT_ID || 'kcm-firebase-b7d6a'
const DB_ID = process.env.FB_DB_ID || 'kcm-db'

async function main() {
  const base = 'http://127.0.0.1'
  const fsBase = `${base}:8087/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`

  // Firestore: create + update to (optionally) trigger onCamperUpdatedV2
  const docPath = `${fsBase}/campers/smoke-${Date.now()}`
  let fres = await fetch(docPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { a: { integerValue: 1 } } }),
  })
  if (!fres.ok) throw new Error(`Firestore create failed ${fres.status}`)
  console.log('Firestore create OK')

  fres = await fetch(`${docPath}?updateMask.fieldPaths=a`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { a: { integerValue: 2 } } }),
  })
  if (!fres.ok) throw new Error(`Firestore update failed ${fres.status}`)
  console.log('Firestore update OK')

  console.log('SMOKE PASS')
}

main().catch(err => {
  console.error('SMOKE FAIL', err)
  process.exit(1)
})
