import { Request, Response, NextFunction } from 'express';

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic to authenticate user
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify token logic here (e.g., using JWT)
    // If valid, attach user info to request object
    // req.user = decodedUser;

    next();
};

export const checkGroupMembership = (req: Request, res: Response, next: NextFunction) => {
    // Middleware logic to check user group membership
    const user = req.user; // Assuming user info is attached by previous middleware

    if (!user || !user.groups.includes('desiredGroup')) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
};