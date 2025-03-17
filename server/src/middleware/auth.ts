import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface UserPayload {
    id: number;
    username?: string;  // Make username optional to match usage
    groups: string[];
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;  // Use the UserPayload interface here
        }
    }
}

export const authenticateUser = (
    req: Request, 
    res: Response, 
    next: NextFunction
): Response | void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;  // Use UserPayload here
        req.user = decoded;
        return next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export const checkGroupMembership = (
    req: Request, 
    res: Response, 
    next: NextFunction
): Response | void => {
    const user = req.user;

    if (!user || !user.groups.includes('desiredGroup')) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    return next();
};
