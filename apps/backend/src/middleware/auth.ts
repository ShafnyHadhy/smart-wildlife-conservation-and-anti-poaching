import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { query } from '../config/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: 'COMMUNITY_MEMBER' | 'RANGER' | 'PARK_MANAGER' | 'COMMUNITY_LIAISON_OFFICER';
  parkId?: string;
  badgeNumber?: string;
}

// Map preset mobile JWT tokens to known identities
const PRESET_TOKEN_MAP: Record<string, AuthenticatedUser> = {
  'jwt-auth-token-ranger-patrol-unit': {
    id: 'aaaa0002-0000-0000-0000-000000000002',
    email: 'ranger@gmail.com',
    fullName: 'Saman Perera',
    role: 'RANGER',
    parkId: '11111111-1111-1111-1111-111111111111',
    badgeNumber: 'RN-101 (R-YAL-002)',
  },
  'jwt-auth-token-cmember-village-rep': {
    id: 'bbbb0001-0000-0000-0000-000000000001',
    email: 'cmember@gmail.com',
    fullName: 'Gamini Senanayake',
    role: 'COMMUNITY_MEMBER',
    parkId: '11111111-1111-1111-1111-111111111111',
  },
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Resolves authentication token from Authorization header if present.
 * Does not block if unauthenticated, allowing manager/web dashboard access without headers.
 */
export async function authenticateOptional(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return next();
  }

  // 1. Check preset tokens
  if (PRESET_TOKEN_MAP[token]) {
    req.user = PRESET_TOKEN_MAP[token];
    return next();
  }

  // 2. Check if token contains user UUID (e.g. Bearer aaaa0002-0000-0000-0000-000000000002)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(token)) {
    try {
      const res = await query('SELECT id, email, full_name, role, park_id, badge_number FROM users WHERE id = $1', [token]);
      if (res.rows[0]) {
        const u = res.rows[0];
        req.user = {
          id: u.id,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          parkId: u.park_id,
          badgeNumber: u.badge_number,
        };
      }
    } catch (_err) {
      // Ignore DB lookup error and continue
    }
  }

  next();
}

/**
 * Strict authentication: throws 401 if not authenticated.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication token required.');
  }
  next();
}

/**
 * Ensures authenticated user has RANGER role.
 */
export function requireRanger(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication token required.');
  }
  if (req.user.role !== 'RANGER') {
    throw new ForbiddenError('This operation is restricted to Rangers.');
  }
  next();
}
