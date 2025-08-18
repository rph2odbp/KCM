"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserDataV2 = exports.createUserProfileV2 = void 0;
// Gen 2 auth triggers (non-blocking) to replace Gen 1 auth functions.
// These are imported and exported by index.ts.
const auth_1 = require("firebase-functions/v2/auth");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)('kcm-db');
exports.createUserProfileV2 = (0, auth_1.onUserCreated)({ region: 'us-central1' }, async (event) => {
    const u = event.data;
    const profile = {
        id: u.uid,
        email: u.email,
        firstName: '',
        lastName: '',
        role: 'guardian',
        phoneNumber: u.phoneNumber || '',
        isActive: true,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(u.uid).set(profile);
    firebase_functions_1.logger.info(`User profile created (v2) for ${u.email}`, { uid: u.uid });
});
exports.deleteUserDataV2 = (0, auth_1.onUserDeleted)({ region: 'us-central1' }, async (event) => {
    const u = event.data;
    await db.collection('users').doc(u.uid).delete();
    firebase_functions_1.logger.info(`User data cleanup (v2) for ${u.email}`, { uid: u.uid });
});
//# sourceMappingURL=auth.migration.js.map