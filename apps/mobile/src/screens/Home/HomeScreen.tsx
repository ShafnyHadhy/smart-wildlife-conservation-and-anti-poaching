import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TabKey } from '../../components/navigation/BottomTabBar';

interface HomeScreenProps {
  isOnline: boolean;
  pendingCount: number;
  onNavigateTab: (tab: TabKey) => void;
  onToggleOnline?: () => void;
  onSyncNow?: () => void;
}

export function HomeScreen({
  isOnline,
  pendingCount,
  onNavigateTab,
  onToggleOnline,
  onSyncNow,
}: HomeScreenProps) {
  const handleAction = (label: string, targetTab?: TabKey) => {
    if (targetTab) {
      onNavigateTab(targetTab);
    } else {
      Alert.alert(
        label,
        'This action will connect to the dedicated feature module in upcoming phases.'
      );
    }
  };

  return (
    <ScreenContainer>
      {/* Welcome & Context Banner */}
      <View style={styles.welcomeSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>SP</Text>
        </View>
        <View style={styles.welcomeTextColumn}>
          <Text style={styles.greeting}>Ayubowan,</Text>
          <Text style={styles.userName}>Saman Perera</Text>
          <View style={styles.roleRow}>
            <Text style={styles.roleText}>Ranger • Yala National Park</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onToggleOnline}
          activeOpacity={0.7}
          style={styles.statusBadgeTouch}
        >
          <StatusBadge
            status={isOnline ? 'ONLINE' : 'OFFLINE'}
            variant={isOnline ? 'success' : 'offline'}
          />
        </TouchableOpacity>
      </View>

      {/* Operational Sync Status Card */}
      <AppCard variant="elevated">
        <View style={styles.syncCardHeader}>
          <Text style={styles.cardHeaderTitle}>Offline Sync Status</Text>
          <StatusBadge
            status={pendingCount === 0 ? 'SYNCED' : `${pendingCount} PENDING`}
            variant={pendingCount === 0 ? 'success' : 'warning'}
            size="small"
          />
        </View>
        <Text style={styles.syncCardText}>
          {isOnline
            ? 'Connected to central command. Live sync active.'
            : 'Working off-grid. All observations stored safely in local queue.'}
        </Text>
        <View style={styles.syncCardActions}>
          {onToggleOnline ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onToggleOnline}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>
                {isOnline ? 'Simulate Offline' : 'Go Online'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {onSyncNow && isOnline && pendingCount > 0 ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onSyncNow}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Sync Now</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </AppCard>

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeading}>Quick Field Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => handleAction('Report Incident', 'REPORTS')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🚨</Text>
          <Text style={styles.actionTitle}>Report Incident</Text>
          <Text style={styles.actionSubtitle}>UC02 • Poaching / Traps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => handleAction('Report Conflict', 'REPORTS')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🐘</Text>
          <Text style={styles.actionTitle}>Report Conflict</Text>
          <Text style={styles.actionSubtitle}>UC04 • Crop / Village</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => handleAction('View Alerts', 'ALERTS')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>⚠</Text>
          <Text style={styles.actionTitle}>Risk Alerts</Text>
          <Text style={styles.actionSubtitle}>UC03 • Collar Geofence</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => handleAction('Start Patrol')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🗺</Text>
          <Text style={styles.actionTitle}>Ranger Patrol</Text>
          <Text style={styles.actionSubtitle}>UC01 • GPS Tracking</Text>
        </TouchableOpacity>
      </View>

      {/* Field Overview Snapshot */}
      <Text style={styles.sectionHeading}>Assigned Sanctuary Area</Text>
      <AppCard>
        <Text style={styles.parkName}>Yala National Park — Block 1</Text>
        <Text style={styles.parkDetails}>
          Boundary Sector: Southeastern Coastal Zone • 978.8 km²
        </Text>
        <View style={styles.parkMetaRow}>
          <Text style={styles.parkMetaItem}>Active Tracked Bulls: 3</Text>
          <Text style={styles.parkMetaItem}>Active Patrol Units: 2</Text>
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0369a1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  welcomeTextColumn: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  roleRow: {
    marginTop: 1,
  },
  roleText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  statusBadgeTouch: {
    marginLeft: 8,
  },
  syncCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  syncCardText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  syncCardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  secondaryButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#131d31',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  parkName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  parkDetails: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  parkMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 8,
  },
  parkMetaItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
});
