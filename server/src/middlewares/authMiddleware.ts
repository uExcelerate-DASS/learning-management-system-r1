import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser, User } from '@/models/User';

/**
 * Extended Request interface that includes user information
 * @interface AuthRequest
 * @extends Request
 */
export interface AuthRequest extends Request {
    user?: IUser;
}

/**
 * Authentication middleware to protect routes
 * @async
 * @param {AuthRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({ message: 'Not authorized to access this route' });
            return;
        }

        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(404).json({ message: 'No user found with this id' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized to access this route' });
        return;
    }
};

/**
 * Role-based authorization middleware
 * @param {...string[]} roles - Allowed roles for the route
 * @returns {Function} Middleware function
 */
export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Not authorized to access this route' });
        }
        next();
    };
};