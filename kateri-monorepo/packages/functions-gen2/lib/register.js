"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionHoldsSummary = exports.ensureSessionCountersDaily = exports.sweepExpiredHoldsV2 = exports.releaseExpiredHolds = exports.confirmRegistration = exports.startRegistration = exports.createRegistration = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const admin_1 = require("./admin");
const sentry_1 = require("./sentry");
exports.createRegistration = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHENTICATED');
    }
    try {
        const { year, sessionId, camper } = (request.data || {});
        if (!year || !sessionId || !camper?.firstName || !camper?.lastName) {
            throw new https_1.HttpsError('invalid-argument', 'INVALID_ARGUMENT');
        }
        if (camper.gender !== 'male' && camper.gender !== 'female') {
            throw new https_1.HttpsError('invalid-argument', 'INVALID_GENDER');
        }
        if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8) {
            throw new https_1.HttpsError('invalid-argument', 'GRADE_OUT_OF_RANGE');
        }
        const genderKey = camper.gender === 'male' ? 'boys' : 'girls';
        const sessionRef = admin_1.db
            .collection('sessions')
            .doc(String(year))
            .collection(genderKey)
            .doc(sessionId);
        const sessionSnap = await sessionRef.get();
        if (!sessionSnap.exists) {
            throw new https_1.HttpsError('not-found', 'SESSION_NOT_FOUND');
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
            throw new https_1.HttpsError('failed-precondition', 'SESSION_FULL');
        }
        const regData = {
            id: regRef.id,
            year,
            gender: genderKey,
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
exports.startRegistration = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHENTICATED');
    try {
        const { year, sessionId, camper, holdMinutes } = (request.data ||
            {});
        firebase_functions_1.logger.info('startRegistration begin', {
            year,
            sessionId,
            camperGender: camper?.gender,
            hasNames: Boolean(camper?.firstName && camper?.lastName),
        });
        if (!year || !sessionId || !camper?.firstName || !camper?.lastName)
            throw new https_1.HttpsError('invalid-argument', 'INVALID_ARGUMENT');
        if (camper.gender !== 'male' && camper.gender !== 'female')
            throw new https_1.HttpsError('invalid-argument', 'INVALID_GENDER');
        if (camper.gradeCompleted < 2 || camper.gradeCompleted > 8)
            throw new https_1.HttpsError('invalid-argument', 'GRADE_OUT_OF_RANGE');
        const genderKey = camper.gender === 'male' ? 'boys' : 'girls';
        const sessionRef = admin_1.db
            .collection('sessions')
            .doc(String(year))
            .collection(genderKey)
            .doc(sessionId);
        firebase_functions_1.logger.info('startRegistration target', {
            databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
            path: `sessions/${String(year)}/${genderKey}/${sessionId}`,
        });
        const regsCol = sessionRef.collection('registrations');
        const holdsCol = sessionRef.collection('holds');
        // ensure camper exists
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
        const result = await admin_1.db.runTransaction(async (tx) => {
            const sSnap = await tx.get(sessionRef);
            if (!sSnap.exists) {
                firebase_functions_1.logger.warn('SESSION_NOT_FOUND', {
                    year,
                    gender: genderKey,
                    sessionId,
                    databaseId: process.env.FIRESTORE_DATABASE_ID || '(default)',
                });
                throw new https_1.HttpsError('not-found', 'SESSION_NOT_FOUND');
            }
            const sData = (sSnap.data() || {});
            const capacity = Number(sData.capacity ?? 0);
            const waitlistOpen = Boolean(sData.waitlistOpen ?? true);
            const holdCount = Number(sData.holdCount ?? 0);
            const confirmedCount = Number(sData.confirmedCount ?? 0);
            const isFull = capacity > 0 && confirmedCount + holdCount >= capacity;
            if (isFull) {
                if (!waitlistOpen)
                    return { status: 'SESSION_FULL' };
                // Return waitlist signal; do not create reg here
                return { status: 'WAITLIST' };
            }
            const holdId = `${uid}_${camperId}`;
            const minutes = Math.max(5, Math.min(holdMinutes ?? 15, 30));
            const expiresAt = firestore_1.Timestamp.fromDate(new Date(Date.now() + minutes * 60 * 1000));
            // Try to find an existing registration for this camper in this session
            const existingQ = await tx.get(regsCol.where('camperId', '==', camperId).limit(1));
            if (!existingQ.empty) {
                const rDoc = existingQ.docs[0];
                const rData = rDoc.data();
                const holdDocSnap = await tx.get(holdsCol.doc(holdId));
                const now = firestore_1.Timestamp.now();
                const activeHold = rData.status === 'holding' &&
                    rData.holdExpiresAt &&
                    now.toMillis() < rData.holdExpiresAt.toMillis() &&
                    holdDocSnap.exists;
                if (activeHold) {
                    // Reuse current active hold
                    return {
                        status: 'HOLDING',
                        regId: rDoc.id,
                        camperId,
                        expiresAt: rData.holdExpiresAt,
                    };
                }
                // Refresh or create hold for this existing registration
                tx.set(holdsCol.doc(holdId), {
                    id: holdId,
                    parentId: uid,
                    camperId,
                    registrationId: rDoc.id,
                    expiresAt,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                // Only increment if there was no hold doc to begin with (prevents double count)
                if (!holdDocSnap.exists) {
                    tx.update(sessionRef, {
                        holdCount: firestore_1.FieldValue.increment(1),
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
                else {
                    tx.update(sessionRef, { updatedAt: firestore_1.FieldValue.serverTimestamp() });
                }
                tx.update(regsCol.doc(rDoc.id), {
                    status: 'holding',
                    holdId,
                    holdExpiresAt: expiresAt,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
                return { status: 'HOLDING', regId: rDoc.id, camperId, expiresAt };
            }
            // No existing registration; create new
            const regRef = regsCol.doc();
            tx.set(holdsCol.doc(holdId), {
                id: holdId,
                parentId: uid,
                camperId,
                registrationId: regRef.id,
                expiresAt,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            tx.update(sessionRef, {
                holdCount: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            tx.set(regRef, {
                id: regRef.id,
                year,
                gender: genderKey,
                sessionId,
                parentId: uid,
                camperId,
                status: 'holding',
                holdId,
                holdExpiresAt: expiresAt,
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
            });
            return { status: 'HOLDING', regId: regRef.id, camperId, expiresAt };
        });
        if (result.status === 'SESSION_FULL' || result.status === 'WAITLIST') {
            return { success: true, data: { registrationId: '', camperId, status: result.status } };
        }
        return {
            success: true,
            data: {
                registrationId: result.regId,
                camperId: result.camperId,
                holdExpiresAt: result.expiresAt.toDate().toISOString(),
                status: result.status,
            },
        };
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'startRegistration' });
        firebase_functions_1.logger.error('startRegistration failed', { message: err.message });
        throw err;
    }
});
exports.confirmRegistration = (0, https_1.onCall)({ region: 'us-central1', invoker: 'public', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHENTICATED');
    try {
        const { year, gender, sessionId, registrationId, depositSuccess } = (request.data ||
            {});
        if (!year || !gender || !sessionId || !registrationId)
            throw new https_1.HttpsError('invalid-argument', 'INVALID_ARGUMENT');
        if (!depositSuccess)
            throw new https_1.HttpsError('failed-precondition', 'DEPOSIT_REQUIRED');
        const sessionRef = admin_1.db
            .collection('sessions')
            .doc(String(year))
            .collection(gender)
            .doc(sessionId);
        const regRef = sessionRef.collection('registrations').doc(registrationId);
        const holdsCol = sessionRef.collection('holds');
        await admin_1.db.runTransaction(async (tx) => {
            const [sSnap, rSnap] = await Promise.all([tx.get(sessionRef), tx.get(regRef)]);
            if (!sSnap.exists)
                throw new https_1.HttpsError('not-found', 'SESSION_NOT_FOUND');
            if (!rSnap.exists)
                throw new https_1.HttpsError('not-found', 'REG_NOT_FOUND');
            const rData = rSnap.data();
            if (rData.parentId && rData.parentId !== uid)
                throw new https_1.HttpsError('permission-denied', 'PERMISSION_DENIED');
            if (rData.status !== 'holding')
                throw new https_1.HttpsError('failed-precondition', 'INVALID_STATUS');
            const now = firestore_1.Timestamp.now();
            if (rData.holdExpiresAt && now.toMillis() > rData.holdExpiresAt.toMillis()) {
                throw new https_1.HttpsError('failed-precondition', 'HOLD_EXPIRED');
            }
            // confirm
            tx.update(sessionRef, {
                holdCount: firestore_1.FieldValue.increment(-1),
                confirmedCount: firestore_1.FieldValue.increment(1),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            tx.update(regRef, {
                status: 'confirmed',
                depositPaid: true,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            if (rData.holdId)
                tx.delete(holdsCol.doc(rData.holdId));
        });
        return { ok: true };
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'confirmRegistration' });
        firebase_functions_1.logger.error('confirmRegistration failed', { message: err.message });
        throw err;
    }
});
// Optional: release expired holds (sweeper)
exports.releaseExpiredHolds = (0, https_1.onCall)({ region: 'us-central1', invoker: 'private', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    const { year, gender, sessionId } = request.data || {};
    const sessionRef = admin_1.db.collection('sessions').doc(String(year)).collection(gender).doc(sessionId);
    const regsCol = sessionRef.collection('registrations');
    const holdsCol = sessionRef.collection('holds');
    const now = firestore_1.Timestamp.now();
    try {
        const expiredHolds = await holdsCol.where('expiresAt', '<=', now).get();
        let toRelease = 0;
        const batch = admin_1.db.batch();
        expiredHolds.forEach(h => {
            const data = h.data();
            if (data.registrationId) {
                batch.update(regsCol.doc(String(data.registrationId)), {
                    status: 'expired',
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            batch.delete(h.ref);
            toRelease++;
        });
        if (toRelease > 0) {
            batch.update(sessionRef, {
                holdCount: firestore_1.FieldValue.increment(-toRelease),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        return { ok: true, released: toRelease };
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'releaseExpiredHolds' });
        firebase_functions_1.logger.error('releaseExpiredHolds failed', { message: err.message });
        throw err;
    }
});
// Scheduled sweep to release expired holds across all sessions
exports.sweepExpiredHoldsV2 = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '*/5 * * * *',
    timeZone: 'America/New_York',
    secrets: [sentry_1.SENTRY_DSN_SECRET],
}, async () => {
    const now = firestore_1.Timestamp.now();
    try {
        const expired = await admin_1.db
            .collectionGroup('holds')
            .where('expiresAt', '<=', now)
            .limit(200)
            .get();
        const bySession = {};
        expired.forEach(h => {
            const parts = h.ref.path.split('/');
            const idx = parts.findIndex(p => p === 'sessions');
            if (idx >= 0 && parts.length >= idx + 5) {
                const sessionPath = parts.slice(0, idx + 4).join('/'); // sessions/{year}/{gender}/{sessionId}
                const data = h.data();
                (bySession[sessionPath] ||= []).push({ holdId: h.id, regId: data.registrationId });
            }
        });
        const commits = [];
        for (const [sessionPath, items] of Object.entries(bySession)) {
            const batch = admin_1.db.batch();
            const sessionRef = admin_1.db.doc(sessionPath);
            let releaseCount = 0;
            for (const it of items) {
                const holdRef = sessionRef.collection('holds').doc(it.holdId);
                batch.delete(holdRef);
                if (it.regId) {
                    const regRef = sessionRef.collection('registrations').doc(it.regId);
                    batch.update(regRef, {
                        status: 'expired',
                        updatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
                releaseCount++;
            }
            if (releaseCount > 0) {
                batch.update(sessionRef, {
                    holdCount: firestore_1.FieldValue.increment(-releaseCount),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            commits.push(batch.commit());
        }
        await Promise.all(commits);
        firebase_functions_1.logger.info('sweepExpiredHoldsV2 completed', {
            sessionsProcessed: Object.keys(bySession).length,
        });
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'sweepExpiredHoldsV2' });
        firebase_functions_1.logger.error('sweepExpiredHoldsV2 failed', { message: err.message });
        throw err;
    }
});
// Daily job to ensure counters exist on all session docs
exports.ensureSessionCountersDaily = (0, scheduler_1.onSchedule)({
    region: 'us-central1',
    schedule: '0 3 * * *',
    timeZone: 'America/New_York',
    secrets: [sentry_1.SENTRY_DSN_SECRET],
}, async () => {
    try {
        const years = await admin_1.db.collection('sessions').get();
        for (const y of years.docs) {
            for (const g of ['boys', 'girls']) {
                const col = y.ref.collection(g);
                const snap = await col.get();
                if (snap.empty)
                    continue;
                const batch = admin_1.db.batch();
                let updates = 0;
                snap.forEach(d => {
                    const data = d.data();
                    const patch = {};
                    if (data.holdCount === undefined)
                        patch.holdCount = 0;
                    if (data.confirmedCount === undefined)
                        patch.confirmedCount = 0;
                    if (Object.keys(patch).length) {
                        patch['updatedAt'] = firestore_1.FieldValue.serverTimestamp();
                        batch.set(d.ref, patch, { merge: true });
                        updates++;
                    }
                });
                if (updates > 0)
                    await batch.commit();
            }
        }
        firebase_functions_1.logger.info('ensureSessionCountersDaily completed');
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'ensureSessionCountersDaily' });
        firebase_functions_1.logger.error('ensureSessionCountersDaily failed', { message: err.message });
        throw err;
    }
});
// Admin-only callable: get current holds count per session (lightweight summary)
exports.getSessionHoldsSummary = (0, https_1.onCall)({ region: 'us-central1', invoker: 'private', secrets: [sentry_1.SENTRY_DSN_SECRET] }, async (request) => {
    try {
        const { year, gender } = (request.data || {});
        if (!year || (gender !== 'boys' && gender !== 'girls'))
            throw new Error('INVALID_ARGUMENT');
        const col = admin_1.db.collection('sessions').doc(String(year)).collection(gender);
        const snap = await col.get();
        const results = [];
        snap.forEach(d => {
            const data = d.data();
            results.push({
                sessionId: d.id,
                holdCount: Number(data.holdCount ?? 0),
                confirmedCount: Number(data.confirmedCount ?? 0),
            });
        });
        return { ok: true, data: results };
    }
    catch (err) {
        (0, sentry_1.captureException)(err, { function: 'getSessionHoldsSummary' });
        firebase_functions_1.logger.error('getSessionHoldsSummary failed', { message: err.message });
        throw err;
    }
});
//# sourceMappingURL=register.js.map