import { test, beforeAll, afterAll } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

let testEnv: RulesTestEnvironment | undefined
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST // e.g. "127.0.0.1:8080"
const SKIP = !EMULATOR
const maybe = SKIP ? test.skip : test

beforeAll(async () => {
  if (SKIP) {
    console.warn('Skipping rules tests: FIRESTORE_EMULATOR_HOST not set')
    return
  }
  const rulesPath = fileURLToPath(new URL('../../../../firestore.rules', import.meta.url))
  const [host, portStr] = (EMULATOR as string).split(':')
  const port = Number(portStr || '8080')
  testEnv = await initializeTestEnvironment({
    projectId: 'kcm-firebase-b7d6a',
    firestore: {
      host,
      port,
      rules: fs.readFileSync(rulesPath, 'utf8'),
    },
  })
})

afterAll(async () => {
  if (testEnv) await testEnv.cleanup()
})

maybe('parent can read their own registration doc but not others', async () => {
  if (!testEnv) throw new Error('Test environment not initialized')
  const admin = testEnv.unauthenticatedContext().firestore()
  const parentA = testEnv.authenticatedContext('parentA').firestore()

  // Seed a session and two registration docs via admin (bypass rules)
  const sRef = doc(admin, 'sessions/2026/boys/s1')
  await setDoc(sRef, { capacity: 10 })
  const regA = doc(admin, 'sessions/2026/boys/s1/registrations/regA')
  await setDoc(regA, {
    parentId: 'parentA',
    year: 2026,
    gender: 'boys',
    sessionId: 's1',
    status: 'holding',
  })
  const regB = doc(admin, 'sessions/2026/boys/s1/registrations/regB')
  await setDoc(regB, {
    parentId: 'parentB',
    year: 2026,
    gender: 'boys',
    sessionId: 's1',
    status: 'holding',
  })

  // A can read own
  await assertSucceeds(getDoc(doc(parentA, 'sessions/2026/boys/s1/registrations/regA')))
  // A cannot read B's
  await assertFails(getDoc(doc(parentA, 'sessions/2026/boys/s1/registrations/regB')))

  // collectionGroup filtered query works for owner id
  const cg = collection(parentA, 'sessions/2026/boys/s1/registrations')
  await assertSucceeds(getDocs(query(cg, where('parentId', '==', 'parentA'))))
  // and fails for other id (no docs returned, but query itself should be allowed; depending on rules this may fail)
})
