import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@wildlife/shared';
import { createAccessToken } from '../services/authTokenService';
import { authenticateOptional, AuthenticatedUser, requireAuth } from '../middleware/auth';
import { query } from '../config/database';
import { sendSuccess } from '../utils/response';

const router = Router();

interface LoginAccount {
  password: string;
  profile: AuthenticatedUser & {
    phoneNumber: string;
    villageName?: string;
    parkName?: string;
  };
}

const DEVELOPMENT_ACCOUNTS: Record<string, LoginAccount> = {
  'cmember@gmail.com': {
    password: 'Cmember@123',
    profile: {
      id: 'bbbb0001-0000-0000-0000-000000000001',
      email: 'cmember@gmail.com',
      fullName: 'Gamini Senanayake',
      role: 'COMMUNITY_MEMBER',
      phoneNumber: '+94 71 111 2233',
      villageName: 'Kittulkote Village',
      parkId: '11111111-1111-1111-1111-111111111111',
      parkName: 'Yala National Park Buffer Zone',
    },
  },
  'ranger@gmail.com': {
    password: 'Ranger@123',
    profile: {
      id: 'aaaa0002-0000-0000-0000-000000000002',
      email: 'ranger@gmail.com',
      fullName: 'Kasun Bandara',
      role: 'RANGER',
      phoneNumber: '+94 77 223 3445',
      badgeNumber: 'RN-101',
      parkId: '11111111-1111-1111-1111-111111111111',
      parkName: 'Yala National Park',
    },
  },
};

function invalidCredentials(res: Response): void {
  res.status(401).json({
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password. Please check your credentials.',
    },
  });
}

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required for authentication.',
        },
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user: AuthenticatedUser & { phoneNumber?: string; villageName?: string; parkName?: string };

    if (process.env.NODE_ENV !== 'production') {
      const account = DEVELOPMENT_ACCOUNTS[normalizedEmail];
      if (!account || account.password !== password) {
        invalidCredentials(res);
        return;
      }

      if (account.profile.role === 'RANGER') {
        const result = await query(
          `SELECT u.id, u.email, u.full_name, u.role, u.phone_number, u.badge_number,
                  u.park_id, p.name AS park_name
           FROM users u
           LEFT JOIN parks p ON p.id = u.park_id
           WHERE u.id = $1 AND u.role = 'RANGER' AND u.is_active = TRUE`,
          [account.profile.id]
        );
        if (!result.rows[0]) {
          invalidCredentials(res);
          return;
        }
        const row = result.rows[0];
        user = {
          ...account.profile,
          id: row.id,
          email: normalizedEmail,
          fullName: row.full_name,
          phoneNumber: row.phone_number ?? undefined,
          badgeNumber: row.badge_number ?? undefined,
          parkId: row.park_id ?? undefined,
          parkName: row.park_name ?? undefined,
        };
      } else {
        user = account.profile;
      }
    } else {
      const result = await query(
        `SELECT u.id, u.email, u.full_name, u.role, u.phone_number, u.badge_number,
                u.park_id, p.name AS park_name
         FROM users u
         LEFT JOIN parks p ON p.id = u.park_id
         WHERE LOWER(u.email) = $1
           AND u.role = $2
           AND u.is_active = TRUE
           AND u.password_hash IS NOT NULL
           AND u.password_hash = crypt($3, u.password_hash)`,
        [normalizedEmail, UserRole.RANGER, password]
      );
      if (!result.rows[0]) {
        invalidCredentials(res);
        return;
      }
      const row = result.rows[0];
      user = {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        phoneNumber: row.phone_number ?? undefined,
        badgeNumber: row.badge_number ?? undefined,
        parkId: row.park_id ?? undefined,
        parkName: row.park_name ?? undefined,
      };
    }

    const token = createAccessToken(user);
    sendSuccess(res, {
      user,
      token,
      message: `Successfully authenticated as ${user.fullName} (${user.role})`,
    });
  })().catch(next);
});

router.get('/me', authenticateOptional, requireAuth, (req: Request, res: Response) => {
  sendSuccess(res, req.user);
});

export default router;
