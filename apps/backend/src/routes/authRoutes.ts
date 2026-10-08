import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response';

const router = Router();

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'COMMUNITY_MEMBER' | 'RANGER' | 'PARK_MANAGER';
  phoneNumber: string;
  villageName?: string;
  badgeNumber?: string;
  parkId: string;
  parkName: string;
  token: string;
}

const PRESET_ACCOUNTS: Record<string, { password: string; profile: UserProfile }> = {
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
      token: 'jwt-auth-token-cmember-village-rep',
    },
  },
  'ranger@gmail.com': {
    password: 'Ranger@123',
    profile: {
      id: 'aaaa0002-0000-0000-0000-000000000002',
      email: 'ranger@gmail.com',
      fullName: 'Saman Perera',
      role: 'RANGER',
      phoneNumber: '+94 77 223 3445',
      badgeNumber: 'RN-101 (R-YAL-002)',
      parkId: '11111111-1111-1111-1111-111111111111',
      parkName: 'Yala National Park',
      token: 'jwt-auth-token-ranger-patrol-unit',
    },
  },
};

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required for authentication.',
      },
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const account = PRESET_ACCOUNTS[normalizedEmail];

  if (!account || account.password !== password) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password. Please check your credentials.',
      },
    });
  }

  return sendSuccess(res, {
    user: account.profile,
    token: account.profile.token,
    message: `Successfully authenticated as ${account.profile.fullName} (${account.profile.role})`,
  });
});

// GET /api/auth/me
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token required.',
      },
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const matched = Object.values(PRESET_ACCOUNTS).find((acc) => acc.profile.token === token);

  if (!matched) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired or invalid token.',
      },
    });
  }

  return sendSuccess(res, matched.profile);
});

export default router;
