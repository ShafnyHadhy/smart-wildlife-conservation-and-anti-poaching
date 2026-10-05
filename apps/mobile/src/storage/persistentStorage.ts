// Local key-value storage supporting Expo FileSystem, web localStorage, and in-memory fallback.
let memoryStore: Record<string, string> = {};

let FileSystemModule: any = null;
try {
  FileSystemModule = require('expo-file-system');
} catch {
  FileSystemModule = null;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class PersistentStorage implements StorageAdapter {
  private getFilePath(key: string): string | null {
    if (FileSystemModule && FileSystemModule.documentDirectory) {
      return `${FileSystemModule.documentDirectory}${key}.json`;
    }
    return null;
  }

  async getItem(key: string): Promise<string | null> {
    const filePath = this.getFilePath(key);
    if (filePath && FileSystemModule) {
      try {
        const info = await FileSystemModule.getInfoAsync(filePath);
        if (info.exists) {
          return await FileSystemModule.readAsStringAsync(filePath);
        }
      } catch (err) {
        console.warn(`[Storage] FileSystem read error for ${key}:`, err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        console.warn(`[Storage] localStorage read error for ${key}:`, err);
      }
    }

    return memoryStore[key] || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;

    const filePath = this.getFilePath(key);
    if (filePath && FileSystemModule) {
      try {
        await FileSystemModule.writeAsStringAsync(filePath, value);
        return;
      } catch (err) {
        console.warn(`[Storage] FileSystem write error for ${key}:`, err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (err) {
        console.warn(`[Storage] localStorage write error for ${key}:`, err);
      }
    }
  }


  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];

    const filePath = this.getFilePath(key);
    if (filePath && FileSystemModule) {
      try {
        const info = await FileSystemModule.getInfoAsync(filePath);
        if (info.exists) {
          await FileSystemModule.deleteAsync(filePath);
        }
      } catch (err) {
        console.warn(`[Storage] FileSystem delete error for ${key}:`, err);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
  }
}

export const persistentStorage = new PersistentStorage();
