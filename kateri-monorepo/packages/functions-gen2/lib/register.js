"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRegistration = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("./admin");
const sentry_1 = require("./sentry");
exports.createRegistration = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new Error('UNAUTHENTICATED');
    }
    try {
        const { year, sessionId, camper } = (request.data || {});
        if (!year || !sessionId || !camper?.firstName || !camper?.lastName) {
            throw new Error('INVALID_ARGUMENT');
        }
        if (camper.gender !== 'male' && camper.gender !== 'female') {
            throw new Error('INVALID_GENDER');
        }
        if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8) {
            throw new Error('GRADE_OUT_OF_RANGE');
        }
        const genderKey = camper.gender === 'male' ? 'boys' : 'girls';
        const sessionRef = admin_1.db
            .collection('sessions')
            .doc(String(year))
            .collection(genderKey)
            .doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            throw new Error('SESSION_NOT_FOUND');
        }
        const sessionData = sessionSnap.data();
        // Capacity and waitlist logic: count active (non-cancelled, non-waitlisted) regs
        const activeStatuses = ['pendingPayment', 'confirmed'];
        const regsCol = sessionRef.collection('registrations');
        const snap = await regsCol.where('status', 'in', activeStatuses).get();
        const currentActive = snap.size;
        const capacity = Number(sessionData.capacity ?? 0);
        const waitlistOpen = Boolean(sessionData.waitlistOpen ?? true);
        const isFull = capacity > 0 && currentActive >= capacity;
        // Ensure camper exists or create under /campers
        let camperId = camper.id;
        if (!camperId) {
            const camperRef = admin_1.db.collection('campers').doc();
            camperId = camperRef.id;
            await camperRef.set({
                id: camperId,
                firstName: camper.firstName,
                lastName: camper.lastName,
                dateOfBirth: new Date(camper.dateOfBirth),
                parentId: uid,
                gender: camper.gender,
                gradeCompleted: camper.gradeCompleted,
                emergencyContacts: [],
                registrationStatus: 'pending',
                medicalInfo: { allergies: [], medications: [], conditions: [] },
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: uid,
            });
        }
        // Create a registration record
        const regRef = sessionRef.collection('registrations').doc();
        const initialStatus = isFull ? (waitlistOpen ? 'waitlisted' : 'cancelled') : 'incomplete';
        if (isFull && !waitlistOpen) {
            throw new Error('SESSION_FULL');
        }
        const regData = {
            id: regRef.id,
            year,
            sessionId,
            parentId: uid,
            camperId,
            status: initialStatus,
            formCompletion: {
                parent: false,
                camper: false,
                health: false,
                consents: false,
                payment: false,
            },
            addOns: { messagePackets: 0 },
            depositPaid: false,
            totalDue: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await regRef.set(regData);
        firebase_functions_1.logger.info('Registration created', { uid, year, sessionId, camperId, regId: regRef.id });
        return { success: true, data: { registrationId: regRef.id, camperId } };
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'createRegistration' });
        firebase_functions_1.logger.error('createRegistration failed', { message: err.message });
        throw err;
    }
});
//# sourceMappingURL=register.js.map