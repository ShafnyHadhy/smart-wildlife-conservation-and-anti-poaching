import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  launchCameraAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchImageLibraryAsync: vi.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

// Lightweight React Native element mock for pure unit test environment
vi.mock('react-native', () => {
  return {
    Platform: {
      OS: 'web',
      select: (obj: any) => obj.web || obj.default,
    },
    View: ({ children, testID, id, style, className }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style, className }, children),
    Text: ({ children, testID, id, style, className }: any) =>
      React.createElement('span', { 'data-testid': testID, id, style, className }, children),
    TextInput: ({ value, onChangeText, placeholder, testID, id, style, disabled, secureTextEntry }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText?.(e.target.value),
        placeholder,
        'data-testid': testID,
        id,
        style,
        disabled,
        type: secureTextEntry ? 'password' : 'text',
      }),
    Image: ({ source, style, testID }: any) =>
      React.createElement('img', {
        src: typeof source === 'string' ? source : source?.uri,
        style,
        'data-testid': testID,
      }),
    TouchableOpacity: ({ children, onPress, testID, id, disabled, style }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', 'data-testid': testID, id, disabled, style }, children),
    ScrollView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    SafeAreaView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    StatusBar: () => null,
    ActivityIndicator: () => React.createElement('span', null, 'Loading...'),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Alert: {
      alert: vi.fn(),
    },
  };
});

import { mobileAuthService } from '../services/authService';
import { LoginScreen } from '../screens/Auth/LoginScreen';

describe('Mobile Authentication & Role Credentials', () => {
  beforeEach(async () => {
    await mobileAuthService.logout();
  });

  it('authenticates Community Member using cmember@gmail.com and Cmember@123', async () => {
    const user = await mobileAuthService.login('cmember@gmail.com', 'Cmember@123');
    expect(user.fullName).toBe('Gamini Senanayake');
    expect(user.role).toBe('COMMUNITY_MEMBER');
    expect(user.email).toBe('cmember@gmail.com');
    expect(user.villageName).toContain('Kittulkote');
  });

  it('authenticates Field Ranger using ranger@gmail.com and Ranger@123', async () => {
    const user = await mobileAuthService.login('ranger@gmail.com', 'Ranger@123');
    expect(user.fullName).toBe('Saman Perera');
    expect(user.role).toBe('RANGER');
    expect(user.email).toBe('ranger@gmail.com');
    expect(user.badgeNumber).toContain('RN-101');
  });

  it('rejects invalid password for registered account', async () => {
    await expect(
      mobileAuthService.login('cmember@gmail.com', 'WrongPassword!')
    ).rejects.toThrow(/Invalid credentials/i);
  });

  it('rejects unknown email address', async () => {
    await expect(
      mobileAuthService.login('unknown@test.com', 'Test@123')
    ).rejects.toThrow(/Invalid credentials/i);
  });

  it('clears session upon logout', async () => {
    await mobileAuthService.login('ranger@gmail.com', 'Ranger@123');
    await mobileAuthService.logout();
    const stored = await mobileAuthService.getStoredUser();
    expect(stored).toBeNull();
  });

  it('renders LoginScreen and signs in successfully with credentials', async () => {
    const onLoginSuccess = vi.fn();
    render(<LoginScreen onLoginSuccess={onLoginSuccess} isOnline={true} />);

    expect(screen.getByText('Sign In to Terminal')).toBeDefined();
    expect(screen.getByText('EMAIL ADDRESS')).toBeDefined();
    expect(screen.getByText('PASSWORD')).toBeDefined();

    // Click Sign In button
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'cmember@gmail.com',
          fullName: 'Gamini Senanayake',
          role: 'COMMUNITY_MEMBER',
        })
      );
    });
  });
});
