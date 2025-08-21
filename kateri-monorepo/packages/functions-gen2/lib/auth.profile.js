"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfile = void 0;
const v1_1 = require("firebase-functions/v1");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("./admin");
const roles_util_js_1 = require("./roles.util.js");
exports.createUserProfile = v1_1.auth.user().onCreate(async (u) => {
    const uid = u.uid;
    const email = (u.email || '').toLowerCase();
    const roles = (0, roles_util_js_1.defaultRolesForEmail)(email);
    const docRef = admin_1.db.doc(`users/${uid}`);
    await docRef.set({
        email,
        displayName: u.displayName || '',
        // Use arrayUnion to add default roles without removing any existing ones (e.g., admin)
        roles: firestore_1.FieldValue.arrayUnion(...roles),
        isActive: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    firebase_functions_1.logger.info('User profile ensured on create', { uid, email, roles });
});
//# sourceMappingURL=auth.profile.js.map