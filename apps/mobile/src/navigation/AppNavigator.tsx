import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBar, TabKey } from '../components/navigation/BottomTabBar';
import { OfflineBanner } from '../components/common/OfflineBanner';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { AlertsScreen } from '../screens/Alerts/AlertsScreen';
import { ReportsScreen } from '../screens/Reports/ReportsScreen';
import { MenuScreen } from '../screens/Menu/MenuScreen';
import { AuthUser } from '../services/authService';

interface AppNavigatorProps {
  isOnline: boolean;
  pendingCount: number;
  onToggleOnline?: () => void;
  onSyncNow?: () => void;
  user?: AuthUser;
  onLogout?: () => void;
}

export function AppNavigator({
  isOnline,
  pendingCount,
  onToggleOnline,
  onSyncNow,
  user,
  onLogout,
}: AppNavigatorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('HOME');
  const [reportInitialView, setReportInitialView] = useState<'hub' | 'conflict_form' | 'conflict_list'>('hub');

  const handleOpenConflictForm = () => {
    setReportInitialView('conflict_form');
    setActiveTab('REPORTS');
  };

  const handleOpenConflictList = () => {
    setReportInitialView('conflict_list');
    setActiveTab('REPORTS');
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'HOME':
        return (
          <HomeScreen
            isOnline={isOnline}
            pendingCount={pendingCount}
            onNavigateTab={(tab) => {
              setReportInitialView('hub');
              setActiveTab(tab);
            }}
            onOpenConflictForm={handleOpenConflictForm}
            onOpenConflictList={handleOpenConflictList}
            onToggleOnline={onToggleOnline}
            onSyncNow={onSyncNow}
            user={user}
          />
        );
      case 'ALERTS':
        return <AlertsScreen user={user} onReportConflict={handleOpenConflictForm} />;
      case 'REPORTS':
        return (
          <ReportsScreen
            pendingCount={pendingCount}
            onSyncPress={onSyncNow}
            isOnline={isOnline}
            user={user}
            initialView={reportInitialView}
            onResetView={() => setReportInitialView('hub')}
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
            user={user}
            onLogout={onLogout}
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
            user={user}
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
    backgroundColor: '#F5F5DC',
  },
  screenContainer: {
    flex: 1,
  },
});
