import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../core/security.js';
import { UserPayload, UserRole } from '../types/index.js';
import { AppError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Missing Bearer token.', 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken<UserPayload>(token);

  if (!payload) {
    throw new AppError('Invalid or expired authentication token.', 401);
  }

  req.user = payload;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`,
        403
      );
    }

    next();
  };
}
