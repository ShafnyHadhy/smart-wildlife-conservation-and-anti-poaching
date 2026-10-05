import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBar, TabKey } from '../components/navigation/BottomTabBar';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { AlertsScreen } from '../screens/Alerts/AlertsScreen';
import { ReportsScreen } from '../screens/Reports/ReportsScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { MenuScreen } from '../screens/Menu/MenuScreen';

interface AppNavigatorProps {
  isOnline: boolean;
  pendingCount: number;
  onToggleOnline?: () => void;
  onSyncNow?: () => void;
}

export function AppNavigator({
  isOnline,
  pendingCount,
  onToggleOnline,
  onSyncNow,
}: AppNavigatorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('HOME');

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'HOME':
        return (
          <HomeScreen
            isOnline={isOnline}
            pendingCount={pendingCount}
            onNavigateTab={setActiveTab}
            onToggleOnline={onToggleOnline}
            onSyncNow={onSyncNow}
          />
        );
      case 'ALERTS':
        return <AlertsScreen />;
      case 'REPORTS':
        return (
          <ReportsScreen
            pendingCount={pendingCount}
            onSyncPress={onSyncNow}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            isOnline={isOnline}
            pendingCount={pendingCount}
            onToggleOnline={onToggleOnline}
            onSyncNow={onSyncNow}
          />
        );
      case 'MENU':
        return (
          <MenuScreen
            onNavigateTab={setActiveTab}
            isOnline={isOnline}
            pendingCount={pendingCount}
            onSyncNow={onSyncNow}
            onToggleOnline={onToggleOnline}
          />
        );
      default:
        return (
          <HomeScreen
            isOnline={isOnline}
            pendingCount={pendingCount}
            onNavigateTab={setActiveTab}
            onToggleOnline={onToggleOnline}
            onSyncNow={onSyncNow}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Offline Alert Strip */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        onSyncPress={onSyncNow}
        onToggleOnline={onToggleOnline}
      />

      {/* Screen Body */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Persistent Bottom Tab Bar */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reportsCount={pendingCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  screenContainer: {
    flex: 1,
  },
});
