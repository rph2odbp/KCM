export declare const helloWorld: import("firebase-functions/v2/https").HttpsFunction;
export declare const dailyHealthCheckV2: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const onCamperUpdatedV2: import("firebase-functions").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions").Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    camperId: string;
}>>;
export { cleanupDeletedUsersDaily } from './auth.cleanup';
export { backupFirestoreDaily } from './backup';
