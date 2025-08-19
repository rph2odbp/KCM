"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfileV2 = void 0;
// Gen 2 auth trigger using Identity blocking hook (before create)
// These are imported and exported by index.ts.
const identity_1 = require("firebase-functions/v2/identity");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)('kcm-db');
exports.createUserProfileV2 = (0, identity_1.beforeUserCreated)({ region: 'us-central1' }, async (event) => {
    const u = event.data;
    const ctx = event.context;
    const providerIds = (u.providerData || []).map(p => p.providerId);
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
    firebase_functions_1.logger.info('User profile created (blocking)', {
        uid: u.uid,
        email: u.email,
        tenantId: u.tenantId || null,
        providerIds,
        locale: ctx?.locale,
        ipAddress: ctx?.ipAddress,
        userAgent: ctx?.userAgent,
    });
});
//# sourceMappingURL=auth.migration.js.map