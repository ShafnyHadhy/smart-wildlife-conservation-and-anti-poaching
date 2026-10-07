import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';

import { AuthUser } from '../../services/authService';

interface AlertItem {
  id: string;
  type: string;
  animalName: string;
  species: string;
  riskLevel: 'HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW';
  locationSummary: string;
  timeAgo: string;
  status: 'ACTIVE' | 'RESPONDING' | 'RESOLVED';
  safetyTip?: string;
}

interface AlertsScreenProps {
  user?: AuthUser;
  onReportConflict?: (notes?: string) => void;
}

const DEMO_ALERTS: AlertItem[] = [
  {
    id: 'alt-001',
    type: 'Wildlife Risk Alert',
    animalName: 'Walagamba',
    species: 'Asian Elephant (Tusker)',
    riskLevel: 'HIGH',
    locationSummary: 'Near Kittulkote Buffer Zone',
    timeAgo: '10 min ago',
    status: 'ACTIVE',
    safetyTip: 'Stay away from edge tree lines and keep livestock in enclosed pens.',
  },
  {
    id: 'alt-002',
    type: 'Geofence Intrusion',
    animalName: 'Kumana Raja',
    species: 'Asian Elephant',
    riskLevel: 'CRITICAL',
    locationSummary: 'Kataragama Agricultural Perimeter',
    timeAgo: '28 min ago',
    status: 'RESPONDING',
    safetyTip: 'Avoid agricultural canal paths after dusk. Ranger team is currently responding.',
  },
  {
    id: 'alt-003',
    type: 'Corridor Deviation',
    animalName: 'Kulu',
    species: 'Sri Lankan Leopard',
    riskLevel: 'MEDIUM',
    locationSummary: 'Block 2 Northern Boundary Rocks',
    timeAgo: '2 hours ago',
    status: 'ACTIVE',
    safetyTip: 'Keep domestic animals sheltered and avoid rocky outcrops at night.',
  },
];

export function AlertsScreen({ user, onReportConflict }: AlertsScreenProps) {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [alerts, setAlerts] = useState<AlertItem[]>(DEMO_ALERTS);
  const [selectedSafetyTip, setSelectedSafetyTip] = useState<{ name: string; tip: string } | null>(null);

  const isRanger = user?.role === 'RANGER';
  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ACTIVE') return a.status === 'ACTIVE' || a.status === 'RESPONDING';
    if (filter === 'RESOLVED') return a.status === 'RESOLVED';
    return true;
  });

  const handleRespondRanger = (alertItem: AlertItem) => {
    Alert.alert(
      `Ranger Action • ${alertItem.animalName}`,
      `Risk Level: ${alertItem.riskLevel}\nLocation: ${alertItem.locationSummary}\n\nRanger units have been alerted for field response.`,
      [
        {
          text: 'Mark Responding',
          onPress: () => {
            setAlerts((prev) =>
              prev.map((a) => (a.id === alertItem.id ? { ...a, status: 'RESPONDING' } : a))
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleReportSightingCommunity = (alertItem: AlertItem) => {
    if (onReportConflict) {
      onReportConflict(`Observed tracked animal (${alertItem.animalName} - ${alertItem.species}) near ${alertItem.locationSummary}.`);
    } else {
      Alert.alert(
        'Report Sighting',
        `To report sighting of ${alertItem.animalName}, please open the Reports tab and click "New Conflict Report".`
      );
    }
  };

  return (
    <View style={styles.outerContainer}>
      <AppHeader
        title="Wildlife Risk Alerts"
        subtitle={
          isCommunityMember
            ? 'Early Warning Proximity Alerts • Community Safety'
            : 'GPS Collar Geofence Tracking • Ranger Triage'
        }
        rightAction={
          <TouchableOpacity
            style={styles.clearToggle}
            onPress={() => setAlerts((prev) => (prev.length > 0 ? [] : DEMO_ALERTS))}
            activeOpacity={0.7}
          >
            <Text style={styles.clearToggleText}>
              {alerts.length > 0 ? 'Demo Empty' : 'Reset'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Advisory Banner for Community Members */}
      {isCommunityMember && (
        <View style={styles.communityBanner}>
          <Text style={styles.communityBannerIcon}>ℹ️</Text>
          <Text style={styles.communityBannerText}>
            These are automated early-warning alerts for your safety. If you see wildlife near your home or farm, tap <Text style={{ fontWeight: '700' }}>Report Sighting</Text> to alert rangers.
          </Text>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScreenContainer scrollable={true} contentContainerStyle={styles.listContent}>
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon="🛡"
            title="No Risk Alerts"
            message={
              filter === 'ALL'
                ? 'All tracked collars are currently safely inside conservation boundaries.'
                : `No ${filter.toLowerCase()} alerts found.`
            }
            actionLabel="Reload Demo Alerts"
            onAction={() => setAlerts(DEMO_ALERTS)}
          />
        ) : (
          filteredAlerts.map((item) => (
            <AppCard key={item.id} variant="elevated">
              <View style={styles.cardHeader}>
                <View style={styles.headerTitleColumn}>
                  <Text style={styles.alertType}>{item.type}</Text>
                  <Text style={styles.animalName}>
                    {item.animalName}{' '}
                    <Text style={styles.animalSpecies}>({item.species})</Text>
                  </Text>
                </View>
                <StatusBadge status={item.riskLevel} />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText}>{item.locationSummary}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>⏱</Text>
                  <Text style={styles.infoText}>{item.timeAgo}</Text>
                </View>
                {item.safetyTip ? (
                  <View style={styles.safetyRow}>
                    <Text style={styles.safetyIcon}>💡</Text>
                    <Text style={styles.safetyText}>{item.safetyTip}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.cardFooter}>
                <StatusBadge status={item.status} size="small" />

                {/* Role-specific Actions */}
                {isRanger ? (
                  <TouchableOpacity
                    style={styles.respondButton}
                    onPress={() => handleRespondRanger(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.respondButtonText}>Take Action ›</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.reportSightingButton}
                    onPress={() => handleReportSightingCommunity(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reportSightingButtonText}>📢 Report Sighting ›</Text>
                  </TouchableOpacity>
                )}
              </View>
            </AppCard>
          ))
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D1B370',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  filterTabActive: {
    backgroundColor: '#3E8E41',
    borderColor: '#3E8E41',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A76D40',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  clearToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  clearToggleText: {
    fontSize: 11,
    color: '#A76D40',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitleColumn: {
    flex: 1,
    marginRight: 8,
  },
  alertType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  animalName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2A1E',
    marginTop: 2,
  },
  animalSpecies: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  cardBody: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E0D0',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E0D0',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
  },
  communityBannerIcon: {
    fontSize: 16,
  },
  communityBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    gap: 6,
  },
  safetyIcon: {
    fontSize: 13,
  },
  safetyText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  respondButton: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  respondButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportSightingButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reportSightingButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
