"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserProfile = exports.setUserRoles = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const v1_1 = require("firebase-functions/v1");
const firebase_functions_1 = require("firebase-functions");
// Local helper (avoid cross-package import)
function defaultRolesForEmail(email) {
    const lower = (email || '').toLowerCase();
    const base = ['parent', 'staff'];
    const adminEmails = new Set(['ryanhallford.br@gmail.com', 'ryanhallford.tx@gmail.com']);
    return adminEmails.has(lower) ? [...base, 'admin'] : base;
}
// Initialize Firebase Admin SDK for compatibility; no Gen 1 exports remain.
admin.initializeApp();
// Ensure Firestore default app uses configured database (default if unset)
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;
if (DATABASE_ID) {
    (0, firestore_1.getFirestore)(DATABASE_ID);
}
else {
    (0, firestore_1.getFirestore)();
}
// Auth triggers migrated to Gen 2 (see @kateri/functions-gen2)
// Callable admin helper (local dev) to set custom claims and mirror roles to /users/{uid}
// Usage (dev): call via admin SDK or HTTP call with server credentials.
// Note: in production, protect this behind proper admin checks.
const setUserRoles = async (req, res) => {
    try {
        const { uid, roles } = req.body || {};
        if (!uid || !Array.isArray(roles)) {
            res.status(400).send({ error: 'uid and roles[] required' });
            return;
        }
        const claims = {};
        roles.forEach((r) => (claims[r] = true));
        await admin.auth().setCustomUserClaims(uid, claims);
        const db = DATABASE_ID ? (0, firestore_1.getFirestore)(DATABASE_ID) : (0, firestore_1.getFirestore)();
        await db
            .collection('users')
            .doc(uid)
            .set({ roles, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        res.status(200).send({ ok: true });
    }
    catch (e) {
        console.error('setUserRoles error', e);
        res.status(500).send({ error: String(e) });
    }
};
exports.setUserRoles = setUserRoles;
// Gen1 auth trigger kept on Node 18 runtime
exports.createUserProfile = v1_1.auth.user().onCreate(async (u) => {
    const uid = u.uid;
    const email = (u.email || '').toLowerCase();
    const roles = defaultRolesForEmail(email);
    const db = DATABASE_ID ? (0, firestore_1.getFirestore)(DATABASE_ID) : (0, firestore_1.getFirestore)();
    await db
        .collection('users')
        .doc(uid)
        .set({
        email,
        displayName: u.displayName || '',
        roles: firestore_1.FieldValue.arrayUnion(...roles),
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    firebase_functions_1.logger.info('User profile ensured on create (Gen1)', { uid, email, roles });
});
//# sourceMappingURL=index.js.map