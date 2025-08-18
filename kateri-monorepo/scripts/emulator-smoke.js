// Minimal emulator smoke: HTTP function and Firestore REST writes
// Requires: firebase emulators:exec --only functions,firestore --project kcm-firebase-b7d6a -- node scripts/emulator-smoke.js
const PROJECT_ID = process.env.FB_PROJECT_ID || 'kcm-firebase-b7d6a'
const REGION = process.env.FB_REGION || 'us-central1'
const DB_ID = process.env.FB_DB_ID || 'kcm-db'

async function main() {
  const base = 'http://127.0.0.1'
  const funcUrl = `${base}:5001/${PROJECT_ID}/${REGION}/helloWorld`
  const fsBase = `${base}:8087/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`

  // HTTP function
  const res = await fetch(funcUrl)
  if (!res.ok) throw new Error(`helloWorld failed ${res.status}`)
  const data = await res.json()
  console.log('helloWorld OK:', data)

  // Firestore: create + update to (optionally) trigger onCamperUpdatedV2
  const docPath = `${fsBase}/campers/smoke-${Date.now()}`
  let fres = await fetch(docPath, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { a: { integerValue: 1 } } }),
  })
  if (!fres.ok) throw new Error(`Firestore create failed ${fres.status}`)
  console.log('Firestore create OK')

  fres = await fetch(docPath + '?updateMask.fieldPaths=a', {
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
