import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { TabKey } from '../../components/navigation/BottomTabBar';

interface MenuScreenProps {
  onNavigateTab: (tab: TabKey) => void;
  isOnline: boolean;
  pendingCount: number;
  onSyncNow?: () => void;
  onToggleOnline?: () => void;
}

export function MenuScreen({
  onNavigateTab,
  isOnline,
  pendingCount,
  onSyncNow,
  onToggleOnline,
}: MenuScreenProps) {
  const handleItemPress = (action: string) => {
    switch (action) {
      case 'HOME':
      case 'ALERTS':
      case 'REPORTS':
      case 'PROFILE':
        onNavigateTab(action as TabKey);
        break;
      case 'SYNC':
        if (onSyncNow) onSyncNow();
        break;
      case 'ONLINE_TOGGLE':
        if (onToggleOnline) onToggleOnline();
        break;
      case 'HELP':
        Alert.alert(
          'Field Ranger Help',
          '• To report an incident off-grid, simply submit as normal. It will be queued in local storage.\n• When returning to park HQ, toggle Online to batch synchronize.\n• For urgent animal geofence breaches, check the Alerts tab.'
        );
        break;
      case 'ABOUT':
        Alert.alert(
          'Smart Wildlife Conservation System',
          'Version 1.0.0 (Phase 3.5 Shell)\nDesigned for Department of Wildlife Conservation, Sri Lanka.'
        );
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.outerContainer}>
      <AppHeader title="System Menu" subtitle="Application Directory & Diagnostics" />

      <ScreenContainer scrollable={true}>
        <Text style={styles.sectionHeading}>Navigation Shortcuts</Text>
        <AppCard>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('HOME')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>⌂</Text>
            <Text style={styles.menuLabel}>Dashboard / Home</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('ALERTS')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>⚠</Text>
            <Text style={styles.menuLabel}>Wildlife Risk Alerts</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('REPORTS')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>Field Reports (Incidents & Conflict)</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastItem]}
            onPress={() => handleItemPress('PROFILE')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuLabel}>Ranger Profile</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </AppCard>

        <Text style={styles.sectionHeading}>Connectivity & Sync</Text>
        <AppCard>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('ONLINE_TOGGLE')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>📡</Text>
            <View style={styles.menuTextColumn}>
              <Text style={styles.menuLabel}>Connectivity Mode</Text>
              <Text style={styles.menuSubLabel}>
                Currently: {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
            <Text style={styles.badgeAction}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastItem]}
            onPress={() => handleItemPress('SYNC')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>🔄</Text>
            <View style={styles.menuTextColumn}>
              <Text style={styles.menuLabel}>Batch Synchronize</Text>
              <Text style={styles.menuSubLabel}>
                {pendingCount > 0 ? `${pendingCount} pending items` : 'Queue empty'}
              </Text>
            </View>
            <Text style={styles.badgeAction}>Sync</Text>
          </TouchableOpacity>
        </AppCard>

        <Text style={styles.sectionHeading}>Information</Text>
        <AppCard>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleItemPress('HELP')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>❓</Text>
            <Text style={styles.menuLabel}>Field User Guide</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.lastItem]}
            onPress={() => handleItemPress('ABOUT')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>ℹ</Text>
            <Text style={styles.menuLabel}>About System</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </AppCard>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E0D0',
  },
  lastItem: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  menuIcon: {
    fontSize: 20,
    color: '#3E8E41',
    width: 32,
    textAlign: 'center',
    marginRight: 10,
  },
  menuTextColumn: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C2A1E',
    flex: 1,
  },
  menuSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: '#A76D40',
    marginLeft: 8,
  },
  badgeAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E8E41',
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3E8E41',
  },
});
