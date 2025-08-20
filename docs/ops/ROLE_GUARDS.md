Server-side role guard notes

This document outlines recommended server-side protections to complement the client-side role switching and routing implemented in the web app.

Why this matters

- Client-side role checks improve UX but cannot be trusted for authorization.
- All sensitive operations must be validated server-side (Cloud Functions) or in Firestore security rules.

Recommendations

1. Firestore security rules

- Store user roles on their user profile document: `/users/{uid}` with a `roles: string[]` field.
- Use custom claims for strongly enforced roles when possible. Custom claims are embedded in the ID token and are authoritative for the auth token's lifetime.
- Example rules (pseudocode):
  - allow read on `/users/{uid}` if request.auth.uid == uid
  - allow write on `/campers/{cid}` if request.auth.uid != null && (resourceOwner == request.auth.uid || request.auth.token.roles contains 'staff' || request.auth.token.roles contains 'admin')

2. Cloud Functions / Callable Functions

- For any server-side operation (create roster, update medical records, export data), validate that the caller's token includes the necessary role.
- Use `getAuth()` in callable functions to access token claims and check `context.auth.token.roles` or `context.auth.token.admin === true`.
- Prefer callable or HTTP functions with explicit role checking over client-side direct writes for privileged operations.

3. Custom Claims and Short TTL

- Use custom claims for admin/staff flags. Keep the token TTL in mind (tokens are cached by the client SDK). After changing claims, force refresh token client-side or implement a short claim TTL pattern.

4. Audit and Logging

- Log role-based access attempts in Cloud Logging for sensitive operations.
- Emit events for role changes and administrative operations.

5. Example server-side check (Node.js / Functions):

const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

exports.createRoster = functions.https.onCall((data, context) => {
if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in')
const roles = context.auth.token.roles || []
if (!roles.includes('staff') && !roles.includes('admin')) {
throw new functions.https.HttpsError('permission-denied', 'Insufficient role')
}
// perform roster creation
})

Notes

- Don't store sensitive flags only in client-side Firestore documents without backing security rules.
- Use a defense-in-depth approach: rules + callable functions + audit logging.
