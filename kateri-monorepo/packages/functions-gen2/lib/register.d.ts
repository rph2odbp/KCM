type CreateRegistrationInput = {
    year: number;
    sessionId: string;
    camper: {
        id?: string;
        firstName: string;
        lastName: string;
        dateOfBirth: string;
        gender: 'male' | 'female';
        gradeCompleted: number;
    };
};
export declare const createRegistration: import("firebase-functions/v2/https").CallableFunction<CreateRegistrationInput, any, unknown>;
type StartRegistrationInput = CreateRegistrationInput & {
    holdMinutes?: number;
};
export declare const startRegistration: import("firebase-functions/v2/https").CallableFunction<StartRegistrationInput, any, unknown>;
type ConfirmInput = {
    year: number;
    gender: 'boys' | 'girls';
    sessionId: string;
    registrationId: string;
    depositSuccess?: boolean;
};
export declare const confirmRegistration: import("firebase-functions/v2/https").CallableFunction<ConfirmInput, any, unknown>;
export declare const releaseExpiredHolds: import("firebase-functions/v2/https").CallableFunction<{
    year: number;
    gender: "boys" | "girls";
    sessionId: string;
}, any, unknown>;
export declare const sweepExpiredHoldsV2: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const ensureSessionCountersDaily: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const getSessionHoldsSummary: import("firebase-functions/v2/https").CallableFunction<{
    year: number;
    gender: "boys" | "girls";
}, any, unknown>;
export {};
