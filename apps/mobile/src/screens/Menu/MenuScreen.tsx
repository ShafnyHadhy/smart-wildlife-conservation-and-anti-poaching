import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { TabKey } from '../../components/navigation/BottomTabBar';
import { AuthUser } from '../../services/authService';

interface MenuScreenProps {
  onNavigateTab: (tab: TabKey) => void;
  isOnline: boolean;
  pendingCount: number;
  onSyncNow?: () => void;
  onToggleOnline?: () => void;
  user?: AuthUser;
  onLogout?: () => void;
}

export function MenuScreen({
  onNavigateTab,
  isOnline,
  pendingCount,
  onSyncNow,
  onToggleOnline,
  user,
  onLogout,
}: MenuScreenProps) {
  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';
  const profileLabel = isCommunityMember ? 'Community Profile' : 'Ranger Profile';

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
      case 'LOGOUT':
        if (onLogout) onLogout();
        break;
      case 'HELP':
        Alert.alert(
          isCommunityMember ? 'Community Reporter Guide' : 'Field Ranger Help',
          isCommunityMember
            ? '• To report crop damage or elephant encounters, tap Reports > Human-Wildlife Conflict.\n• Reports are stored offline if network is low and synced when online.\n• For life-threatening emergencies, contact the local range hotline.'
            : '• To report an incident off-grid, simply submit as normal. It will be queued in local storage.\n• When returning to park HQ, toggle Online to batch synchronize.\n• For urgent animal geofence breaches, check the Alerts tab.'
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
        {/* Active Session Card */}
        {user && (
          <>
            <Text style={styles.sectionHeading}>Active Terminal Session</Text>
            <AppCard>
              <View style={styles.sessionRow}>
                <View style={styles.sessionAvatar}>
                  <Text style={styles.sessionAvatarText}>{user.initials}</Text>
                </View>
                <View style={styles.sessionDetails}>
                  <Text style={styles.sessionName}>{user.fullName}</Text>
                  <Text style={styles.sessionEmail}>{user.email}</Text>
                  <Text style={styles.sessionRole}>{user.subtitle}</Text>
                </View>
              </View>
              {onLogout && (
                <TouchableOpacity
                  style={styles.switchUserButton}
                  onPress={() => handleItemPress('LOGOUT')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchUserButtonText}>🚪 Switch Account / Sign Out</Text>
                </TouchableOpacity>
              )}
            </AppCard>
          </>
        )}

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
            style={[styles.menuItem, styles.lastItem]}
            onPress={() => handleItemPress('REPORTS')}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>📋</Text>
            <Text style={styles.menuLabel}>Field Reports (Incidents & Conflict)</Text>
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
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3E8E41',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionAvatarText: {
    color: '#FAF7EE',
    fontSize: 16,
    fontWeight: '800',
  },
  sessionDetails: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  sessionEmail: {
    fontSize: 12,
    color: '#A76D40',
    fontWeight: '600',
    marginTop: 1,
  },
  sessionRole: {
    fontSize: 11,
    color: '#556658',
    marginTop: 2,
  },
  switchUserButton: {
    marginTop: 10,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchUserButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
