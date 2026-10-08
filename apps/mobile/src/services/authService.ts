import { persistentStorage } from '../storage/persistentStorage';

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
      fullName: 'Saman Perera',
      role: 'RANGER',
      phoneNumber: '+94 77 223 3445',
      badgeNumber: 'RN-101 (R-YAL-002)',
      parkName: 'Yala National Park',
      initials: 'SP',
      subtitle: 'Ranger • Yala National Park',
      token: 'jwt-auth-token-ranger-patrol-unit',
    },
  },
};

const STORAGE_KEY_AUTH_USER = 'wildlife_mobile_auth_user';

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
        this.currentUser = JSON.parse(raw);
        this.isLoaded = true;
        return this.currentUser;
      }
    } catch (err) {
      console.warn('[AuthService] Could not read stored user session:', err);
    }

    this.isLoaded = true;
    return null;
  }

  async login(emailInput: string, passwordInput: string): Promise<AuthUser> {
    const email = (emailInput || '').trim().toLowerCase();
    const password = (passwordInput || '').trim();

    const matched = PRESET_USERS[email];
    if (!matched || matched.password !== password) {
      throw new Error(
        'Invalid credentials. Please verify your email and password or use the demo quick-login buttons.'
      );
    }

    const authenticatedUser = matched.user;
    this.currentUser = authenticatedUser;

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
        description: 'Saman Perera • Yala National Park (Rapid Field Response)',
      },
    ];
  }
}

export const mobileAuthService = new MobileAuthService();
