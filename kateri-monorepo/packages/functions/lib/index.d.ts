import type { Request, Response } from 'express';
export declare const setUserRoles: (req: Request, res: Response) => Promise<void>;
export declare const createUserProfile: import("firebase-functions/v1").CloudFunction<import("firebase-admin/auth").UserRecord>;
