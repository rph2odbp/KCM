import { test, beforeAll, afterAll } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import fs from 'node:fs'
import path from 'node:path'

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'kcm-firebase-b7d6a',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../../../firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

test('parent can read their own registration doc but not others', async () => {
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
