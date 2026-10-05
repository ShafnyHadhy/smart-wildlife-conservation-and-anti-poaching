import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';

interface ProfileScreenProps {
  isOnline: boolean;
  pendingCount: number;
  onToggleOnline?: () => void;
  onSyncNow?: () => void;
}

export function ProfileScreen({
  isOnline,
  pendingCount,
  onToggleOnline,
  onSyncNow,
}: ProfileScreenProps) {
  const handleSupportAction = (label: string) => {
    Alert.alert(label, 'Support action dispatched to Department of Wildlife Conservation HQ.');
  };

  return (
    <View style={styles.outerContainer}>
      <AppHeader
        title="Field Profile"
        subtitle="Department of Wildlife Conservation • Sri Lanka"
      />

      <ScreenContainer scrollable={true}>
        {/* Profile Card */}
        <AppCard variant="elevated">
          <View style={styles.profileHeader}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTextLarge}>SP</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.fullName}>Saman Perera</Text>
              <Text style={styles.badgeCode}>Badge # R-YAL-002</Text>
              <View style={styles.roleBadgeContainer}>
                <StatusBadge status="RANGER" variant="info" size="small" />
              </View>
            </View>
          </View>

          <View style={styles.detailList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Assigned Park</Text>
              <Text style={styles.detailValue}>Yala National Park</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Operating Sector</Text>
              <Text style={styles.detailValue}>Block 1 & Coastal Perimeter</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Official Contact</Text>
              <Text style={styles.detailValue}>saman.perera@dwlc.gov.lk</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Field Radio ID</Text>
              <Text style={styles.detailValue}>R-YAL-CH4</Text>
            </View>
          </View>
        </AppCard>

        {/* Device & Sync Diagnostic */}
        <Text style={styles.sectionHeading}>Terminal Status</Text>
        <AppCard>
          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Cellular Connection</Text>
            <TouchableOpacity onPress={onToggleOnline} activeOpacity={0.7}>
              <StatusBadge
                status={isOnline ? 'ONLINE' : 'OFFLINE'}
                variant={isOnline ? 'success' : 'offline'}
                size="small"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Pending Local Queue</Text>
            <Text style={styles.statusRowValue}>
              {pendingCount === 0 ? 'All synced' : `${pendingCount} item(s)`}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Database Target</Text>
            <Text style={styles.statusRowValue}>Neon PostgreSQL (Serverless)</Text>
          </View>

          {onSyncNow && isOnline && pendingCount > 0 ? (
            <TouchableOpacity
              style={styles.syncFullButton}
              onPress={onSyncNow}
              activeOpacity={0.8}
            >
              <Text style={styles.syncFullButtonText}>
                Synchronize {pendingCount} Pending Operation(s)
              </Text>
            </TouchableOpacity>
          ) : null}
        </AppCard>

        {/* Quick Emergency Assistance */}
        <Text style={styles.sectionHeading}>Emergency & Support</Text>
        <AppCard>
          <TouchableOpacity
            style={styles.emergencyItem}
            onPress={() => handleSupportAction('Emergency SOS')}
            activeOpacity={0.7}
          >
            <Text style={styles.emergencyIcon}>🆘</Text>
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>Broadcast Emergency Ping</Text>
              <Text style={styles.emergencyDesc}>Alerts Yala Headquarters command desk</Text>
            </View>
          </TouchableOpacity>
        </AppCard>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarTextLarge: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  fullName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  badgeCode: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  roleBadgeContainer: {
    marginTop: 6,
  },
  detailList: {
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  statusRowLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
  },
  syncFullButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  syncFullButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  emergencyIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  emergencyText: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f87171',
  },
  emergencyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
});
