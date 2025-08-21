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
export {};
