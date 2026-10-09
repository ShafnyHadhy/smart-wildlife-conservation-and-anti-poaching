import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedUser } from '../src/middleware/auth';
import { createAccessToken, verifyAccessToken } from '../src/services/authTokenService';

const ranger: AuthenticatedUser = {
  id: 'ranger-1',
  email: 'ranger@example.test',
  fullName: 'Test Ranger',
  role: 'RANGER',
};

describe('Ranger access tokens', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('verifies a signed token and preserves its Ranger identity', () => {
    vi.stubEnv('AUTH_TOKEN_SECRET', 'a-test-signing-secret-with-at-least-32-characters');
    const token = createAccessToken(ranger, 1_700_000_000_000);

    expect(verifyAccessToken(token, 1_700_000_001_000)?.user).toEqual(ranger);
  });

  it('rejects a token whose signature or payload has been changed', () => {
    vi.stubEnv('AUTH_TOKEN_SECRET', 'a-test-signing-secret-with-at-least-32-characters');
    const token = createAccessToken(ranger, 1_700_000_000_000);
    const [version, payload, signature] = token.split('.');

    expect(verifyAccessToken(`${version}.${payload}.${signature.slice(1)}`)).toBeNull();
    expect(verifyAccessToken(`${version}.${payload.slice(0, -1)}x.${signature}`)).toBeNull();
  });

  it('rejects expired tokens', () => {
    vi.stubEnv('AUTH_TOKEN_SECRET', 'a-test-signing-secret-with-at-least-32-characters');
    const issuedAt = 1_700_000_000_000;
    const token = createAccessToken(ranger, issuedAt);

    expect(verifyAccessToken(token, issuedAt + 8 * 60 * 60 * 1000)).toBeNull();
  });
});
