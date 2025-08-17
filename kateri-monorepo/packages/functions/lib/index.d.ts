import * as functions from 'firebase-functions';
export declare const helloWorld: functions.HttpsFunction;
export declare const createUserProfile: functions.CloudFunction<import("firebase-admin/auth").UserRecord>;
export declare const deleteUserData: functions.CloudFunction<import("firebase-admin/auth").UserRecord>;
export declare const dailyHealthCheck: functions.CloudFunction<unknown>;
export declare const onCamperUpdate: functions.CloudFunction<functions.Change<functions.firestore.QueryDocumentSnapshot>>;
