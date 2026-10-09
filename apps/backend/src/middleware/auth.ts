import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { query } from '../config/database';
import { verifyAccessToken } from '../services/authTokenService';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'COMMUNITY_MEMBER' | 'RANGER' | 'PARK_MANAGER' | 'COMMUNITY_LIAISON_OFFICER';
  parkId?: string;
  badgeNumber?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Resolves an optional signed access token. Unauthenticated manager reads remain supported.
 */
export async function authenticateOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  if (!match) {
    next(new UnauthorizedError('A valid Bearer token is required.'));
    return;
  }

  const claims = verifyAccessToken(match[1]);
  if (!claims) {
    next(new UnauthorizedError('Session expired or invalid token.'));
    return;
  }

  try {
    if (claims.role === 'RANGER') {
      const result = await query(
        `SELECT id, email, full_name, role, park_id, badge_number
         FROM users
         WHERE id = $1 AND role = 'RANGER' AND is_active = TRUE`,
        [claims.sub]
      );
      const user = result.rows[0];
      if (!user) {
        next(new UnauthorizedError('Ranger account is inactive or no longer exists.'));
        return;
      }
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        parkId: user.park_id,
        badgeNumber: user.badge_number,
      };
    } else {
      req.user = claims.user;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication token required.'));
    return;
  }
  next();
}

export function requireRanger(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError('Authentication token required.'));
    return;
  }
  if (req.user.role !== 'RANGER') {
    next(new ForbiddenError('This operation is restricted to Rangers.'));
    return;
  }
  next();
}
