import { persistentStorage } from '../storage/persistentStorage';
import { mobileApiClient } from './apiClient';

export type UserRoleType = 'COMMUNITY_MEMBER' | 'RANGER' | 'PARK_MANAGER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRoleType;
  phoneNumber?: string;
  villageName?: string;
  badgeNumber?: string;
  parkName?: string;
  initials: string;
  subtitle: string;
  token?: string;
}

export const PRESET_USERS: Record<string, { password: string; user: AuthUser }> = {
  'cmember@gmail.com': {
    password: 'Cmember@123',
    user: {
      id: 'bbbb0001-0000-0000-0000-000000000001',
      email: 'cmember@gmail.com',
      fullName: 'Gamini Senanayake',
      role: 'COMMUNITY_MEMBER',
      phoneNumber: '+94 71 111 2233',
      villageName: 'Kittulkote Village',
      parkName: 'Yala National Park Buffer Zone',
      initials: 'GS',
      subtitle: 'Community Member • Kittulkote Buffer Zone',
      token: 'jwt-auth-token-cmember-village-rep',
    },
  },
  'ranger@gmail.com': {
    password: 'Ranger@123',
    user: {
      id: 'aaaa0002-0000-0000-0000-000000000002',
      email: 'ranger@gmail.com',
      fullName: 'Kasun Bandara',
      role: 'RANGER',
      phoneNumber: '+94 77 223 3445',
      badgeNumber: 'RN-101',
      parkName: 'Yala National Park',
      initials: 'KB',
      subtitle: 'Ranger • Yala National Park',
      token: 'jwt-auth-token-ranger-patrol-unit',
    },
  },
};

const STORAGE_KEY_AUTH_USER = 'wildlife_mobile_auth_user';

function isSignedAccessToken(token: string): boolean {
  return /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

export class MobileAuthService {
  private currentUser: AuthUser | null = null;
  private isLoaded = false;

  async getStoredUser(): Promise<AuthUser | null> {
    if (this.isLoaded && this.currentUser) {
      return this.currentUser;
    }

    try {
      const raw = await persistentStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (raw) {
        const storedUser = JSON.parse(raw) as AuthUser;
        if (storedUser.token && !isSignedAccessToken(storedUser.token)) {
          console.warn('[AuthService] Discarding a legacy unsigned session; sign in again to continue patrol actions.');
          storedUser.token = undefined;
          await persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(storedUser));
        }
        this.currentUser = storedUser;
        this.isLoaded = true;
        mobileApiClient.setAuthToken(this.currentUser?.token || null);
        return this.currentUser;
      }
    } catch (err) {
      console.warn('[AuthService] Could not read stored user session:', err);
    }

    this.isLoaded = true;
    mobileApiClient.setAuthToken(null);
    return null;
  }

  async login(emailInput: string, passwordInput: string): Promise<AuthUser> {
    const email = (emailInput || '').trim().toLowerCase();
    const password = (passwordInput || '').trim();

    // 1. Attempt live authentication with backend to retrieve authoritative database user
    try {
      const authRes = await mobileApiClient.post<{ user: any; token: string }>('/auth/login', {
        email,
        password,
      });
      if (authRes && authRes.user) {
        const u = authRes.user;
        const initials = u.fullName
          ? u.fullName
              .split(' ')
              .map((part: string) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : 'RN';

        const liveUser: AuthUser = {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          role: u.role,
          phoneNumber: u.phoneNumber,
          villageName: u.villageName,
          badgeNumber: u.badgeNumber,
          parkName: u.parkName,
          initials,
          subtitle:
            u.role === 'RANGER'
              ? `Ranger • ${u.parkName || 'National Park'}`
              : `Community Member • ${u.villageName || 'Local Sector'}`,
          token: authRes.token || u.token,
        };

        this.currentUser = liveUser;
        mobileApiClient.setAuthToken(liveUser.token || null);

        try {
          await persistentStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(liveUser));
        } catch (err) {
          console.warn('[AuthService] Could not persist user session:', err);
        }

        return liveUser;
      }
    } catch (_liveErr) {
      // Offline fallback: verify credentials against preset offline accounts
    }

    const matched = PRESET_USERS[email];
    if (!matched || matched.password !== password) {
      throw new Error(
        'Invalid credentials. Please verify your email and password or use the demo quick-login buttons.'
      );
    }

    const authenticatedUser = { ...matched.user, token: undefined };
    this.currentUser = authenticatedUser;
    mobileApiClient.setAuthToken(null);

    try {
      await persistentStorage.setItem(
        STORAGE_KEY_AUTH_USER,
        JSON.stringify(authenticatedUser)
      );
    } catch (err) {
      console.warn('[AuthService] Could not persist user session:', err);
    }

    return authenticatedUser;
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    mobileApiClient.setAuthToken(null);
    try {
      await persistentStorage.removeItem(STORAGE_KEY_AUTH_USER);
    } catch (err) {
      console.warn('[AuthService] Could not clear user session:', err);
    }
  }

  getPresetAccounts() {
    return [
      {
        email: 'cmember@gmail.com',
        password: 'Cmember@123',
        label: 'Community Member',
        icon: '👤',
        description: 'Gamini Senanayake • Kittulkote Buffer Zone (UC-04 Reporter)',
      },
      {
        email: 'ranger@gmail.com',
        password: 'Ranger@123',
        label: 'Field Ranger',
        icon: '🛡️',
        description: 'Kasun Bandara • Yala National Park (Rapid Field Response)',
      },
    ];
  }
}

export const mobileAuthService = new MobileAuthService();
