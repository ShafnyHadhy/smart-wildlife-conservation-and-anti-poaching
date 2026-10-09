import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { AuthenticatedUser } from '../middleware/auth';

interface AccessTokenClaims {
  sub: string;
  role: AuthenticatedUser['role'];
  user: AuthenticatedUser;
  issuedAt: number;
  expiresAt: number;
}

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;
let developmentSecret: string | undefined;

function getSigningSecret(): string {
  const configuredSecret = process.env.AUTH_TOKEN_SECRET;
  if (configuredSecret && configuredSecret.length >= 32) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_TOKEN_SECRET must contain at least 32 characters in production.');
  }

  if (!developmentSecret) {
    developmentSecret = randomBytes(32).toString('base64url');
    console.warn('[Auth] AUTH_TOKEN_SECRET is unset; using a temporary development signing key.');
  }
  return developmentSecret;
}

function sign(value: string): string {
  return createHmac('sha256', getSigningSecret()).update(value).digest('base64url');
}

export function createAccessToken(user: AuthenticatedUser, now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  const claims: AccessTokenClaims = {
    sub: user.id,
    role: user.role,
    user,
    issuedAt,
    expiresAt: issuedAt + TOKEN_LIFETIME_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signedValue = `v1.${payload}`;
  return `${signedValue}.${sign(signedValue)}`;
}

export function verifyAccessToken(token: string, now = Date.now()): AccessTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    return null;
  }

  try {
    const signedValue = `${parts[0]}.${parts[1]}`;
    const expectedSignature = Buffer.from(sign(signedValue), 'base64url');
    const actualSignature = Buffer.from(parts[2], 'base64url');
    if (
      expectedSignature.length !== actualSignature.length ||
      !timingSafeEqual(expectedSignature, actualSignature)
    ) {
      return null;
    }

    const claims = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8')
    ) as Partial<AccessTokenClaims>;
    const allowedRoles: AuthenticatedUser['role'][] = [
      'COMMUNITY_MEMBER',
      'RANGER',
      'PARK_MANAGER',
      'COMMUNITY_LIAISON_OFFICER',
    ];
    if (
      typeof claims.sub !== 'string' ||
      typeof claims.issuedAt !== 'number' ||
      typeof claims.expiresAt !== 'number' ||
      claims.expiresAt <= Math.floor(now / 1000) ||
      !claims.user ||
      claims.user.id !== claims.sub ||
      !allowedRoles.includes(claims.role as AuthenticatedUser['role']) ||
      claims.user.role !== claims.role
    ) {
      return null;
    }

    return claims as AccessTokenClaims;
  } catch {
    return null;
  }
}
