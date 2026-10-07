import { persistentStorage } from '../../../storage/persistentStorage';

const key = (userId: string) => `hwc_notifications_seen_${userId}`;

/** Remembers when a community member last opened their notifications. */
export const notificationStore = {
  async getSeenAt(userId: string): Promise<number> {
    try {
      const raw = await persistentStorage.getItem(key(userId));
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  },
  async markAllSeen(userId: string, at: number = Date.now()): Promise<void> {
    try {
      await persistentStorage.setItem(key(userId), String(at));
    } catch {
      // Non-critical – notifications simply stay unread.
    }
  },
};
