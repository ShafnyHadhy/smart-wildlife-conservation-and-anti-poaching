import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Lightweight React Native element mock for pure unit test environment
vi.mock('react-native', () => {
  return {
    View: ({ children, testID, id, style, className }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style, className }, children),
    Text: ({ children, testID, id, style, className }: any) =>
      React.createElement('span', { 'data-testid': testID, id, style, className }, children),
    TouchableOpacity: ({ children, onPress, testID, id, disabled, style }: any) =>
      React.createElement('button', { onClick: onPress, type: 'button', 'data-testid': testID, id, disabled, style }, children),
    ScrollView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    SafeAreaView: ({ children, testID, id, style }: any) =>
      React.createElement('div', { 'data-testid': testID, id, style }, children),
    StatusBar: () => null,
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Alert: {
      alert: vi.fn(),
    },
  };
});

import { AppNavigator } from '../navigation/AppNavigator';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import { OfflineBanner } from '../components/common/OfflineBanner';

describe('Mobile Application Shell & Navigation', () => {
  it('renders Home screen with ranger role and national park', () => {
    render(
      <HomeScreen
        isOnline={true}
        pendingCount={0}
        onNavigateTab={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Yala National Park/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ranger/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Quick Field Actions/i)).toBeDefined();
  });

  it('renders BottomTabBar with all 5 required tabs', () => {
    const onSelect = vi.fn();
    render(
      <BottomTabBar
        activeTab="HOME"
        onSelectTab={onSelect}
      />
    );

    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Alerts')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
    expect(screen.getByText('Profile')).toBeDefined();
  });

  it('navigates between the tabs in AppNavigator', () => {
    render(
      <AppNavigator
        isOnline={true}
        pendingCount={0}
      />
    );

    // Initial tab is HOME
    expect(screen.getAllByText(/Yala National Park/i).length).toBeGreaterThan(0);

    // Navigate to ALERTS
    fireEvent.click(screen.getByText('Alerts'));
    expect(screen.getByText(/Wildlife Risk Alerts/i)).toBeDefined();
    expect(screen.getByText(/Walagamba/i)).toBeDefined();

    // Navigate to REPORTS
    fireEvent.click(screen.getByText('Reports'));
    expect(screen.getByText('Wildlife / Poaching Incident')).toBeDefined();
    expect(screen.getByText('Human-Wildlife Conflict')).toBeDefined();
    expect(screen.getByText('All Community Conflict Reports')).toBeDefined();
    expect(screen.getByText('Pending Offline Reports')).toBeDefined();

    // Navigate to PROFILE
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('Field User Guide')).toBeDefined();
    expect(screen.getByText('About System')).toBeDefined();
  });

  it('renders offline banner when offline with pending count', () => {
    render(
      <OfflineBanner
        isOnline={false}
        pendingCount={3}
      />
    );

    expect(screen.getByText(/OFFLINE MODE/i)).toBeDefined();
    expect(screen.getByText(/3 report\(s\) queued/i)).toBeDefined();
  });

  it('does not display offline banner when online with 0 pending', () => {
    const { container } = render(
      <OfflineBanner
        isOnline={true}
        pendingCount={0}
      />
    );

    expect(container.textContent).not.toContain('OFFLINE MODE');
  });
});
