import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Lightweight React Native element mock for pure unit test environment
vi.mock('react-native', () => {
  return {
    View: ({ children, testID, ...props }: any) =>
      React.createElement('div', { 'data-testid': testID, ...props }, children),
    Text: ({ children, ...props }: any) =>
      React.createElement('span', props, children),
    TextInput: ({ value, onChangeText, placeholder, ...props }: any) =>
      React.createElement('input', {
        value,
        onChange: (e: any) => onChangeText?.(e.target.value),
        placeholder,
        ...props,
      }),
    TouchableOpacity: ({ children, onPress, ...props }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', ...props }, children),
    ScrollView: ({ children, ...props }: any) =>
      React.createElement('div', props, children),
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('div', props, children),
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
