import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import { AuthUser } from '../../services/authService';
import {
  WildlifeRiskAlert,
  AlertStatus,
} from '../../features/uc03-alerts/types';
import { mobileAlertService } from '../../features/uc03-alerts/services/alertService';
import { AlertDetailScreen } from '../../features/uc03-alerts/screens/AlertDetailScreen';

export type AlertFilter = 'ALL' | AlertStatus;

interface AlertsScreenProps {
  user?: AuthUser;
  onReportConflict?: (notes?: string) => void;
  isOnline?: boolean;
  onSyncNow?: () => void;
  initialAlertId?: string;
}

const FILTER_TABS: Array<{ key: AlertFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: AlertStatus.ACTIVE, label: 'Active' },
  { key: AlertStatus.ACKNOWLEDGED, label: 'Acknowledged' },
  { key: AlertStatus.RESPONDING, label: 'Responding' },
  { key: AlertStatus.RESOLVED, label: 'Resolved' },
];

export function AlertsScreen({
  user,
  onReportConflict,
  isOnline = true,
  onSyncNow,
  initialAlertId,
}: AlertsScreenProps) {
  const [filter, setFilter] = useState<AlertFilter>('ALL');
  const [alerts, setAlerts] = useState<WildlifeRiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    initialAlertId || null
  );

  const isRanger = user?.role === 'RANGER' || !user?.role;
  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';

  const loadAlerts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await mobileAlertService.getAlerts(
        filter === 'ALL' ? undefined : filter,
        isOnline
      );
      setAlerts(data || []);
    } catch (err: any) {
      console.warn('[AlertsScreen] Error fetching alerts:', err);
      setError(err.message || 'Unable to load wildlife alerts from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, isOnline]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // If master-detail item is selected, render AlertDetailScreen
  if (selectedAlertId) {
    return (
      <AlertDetailScreen
        alertId={selectedAlertId}
        onBack={() => {
          setSelectedAlertId(null);
          loadAlerts();
        }}
        isOnline={isOnline}
        onSyncNow={onSyncNow}
        user={user}
        onAlertUpdated={() => {
          loadAlerts();
        }}
      />
    );
  }

  const handleReportSightingCommunity = (alertItem: WildlifeRiskAlert) => {
    if (onReportConflict) {
      const summary = `Observed tracked animal (${alertItem.animalName || 'Wildlife'} - ${
        alertItem.animalSpecies || 'Species'
      }) near ${alertItem.zoneName || 'sanctuary boundary'}.`;
      onReportConflict(summary);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <AppHeader
        title="Wildlife Risk Alerts"
        subtitle={
          isCommunityMember
            ? 'Early Warning Proximity Alerts • Community Safety'
            : 'GPS Collar Geofence Tracking • Field Responder Triage'
        }
        rightAction={
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => loadAlerts(true)}
            activeOpacity={0.7}
            disabled={refreshing || loading}
          >
            <Text style={styles.refreshBtnText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Offline Status Notice */}
      {!isOnline && (
        <View style={styles.offlineWarningBanner}>
          <Text style={styles.offlineWarningIcon}>📡</Text>
          <View style={styles.offlineWarningContent}>
            <Text style={styles.offlineWarningTitle}>Offline Mode Active</Text>
            <Text style={styles.offlineWarningText}>
              {alerts.length > 0
                ? 'Displaying locally cached geofence alerts. Responder transitions will be safely stored offline and replayed upon reconnection.'
                : 'No cached alerts available locally. Connect to network to download active risk alerts.'}
            </Text>
            {onSyncNow && (
              <TouchableOpacity
                style={styles.syncNowBtn}
                onPress={onSyncNow}
                activeOpacity={0.8}
              >
                <Text style={styles.syncNowBtnText}>Retry Sync ›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Advisory Banner for Community Members */}
      {isCommunityMember && (
        <View style={styles.communityBanner}>
          <Text style={styles.communityBannerIcon}>ℹ️</Text>
          <Text style={styles.communityBannerText}>
            These are automated early-warning alerts for your safety. If you see
            wildlife near your home or farm, tap{' '}
            <Text style={{ fontWeight: '700' }}>Report Sighting</Text> to alert
            rangers.
          </Text>
        </View>
      )}

      {/* Horizontal Status Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
                testID={`filter-${tab.key.toLowerCase()}`}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Alerts List */}
      <ScreenContainer
        scrollable={true}
        contentContainerStyle={styles.listContent}
      >
        {loading && !refreshing ? (
          <LoadingState message="Connecting to sanctuary server & loading risk alerts..." />
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Error Loading Alerts</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadAlerts()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="No Risk Alerts Found"
            message={
              filter === 'ALL'
                ? 'All tracked wildlife collars are safely inside conservation boundaries.'
                : `No alerts currently match the '${filter}' status filter.`
            }
            actionLabel="Refresh Live Alerts"
            onAction={() => loadAlerts()}
          />
        ) : (
          alerts.map((item) => {
            const hasLocation = !!item.location;
            const formattedDate = item.generatedAt
              ? new Date(item.generatedAt).toLocaleString()
              : 'Recent';

            return (
              <AppCard
                key={item.id}
                variant="elevated"
                style={styles.alertCard}
              >
                {/* Header: Animal Name, Species, Severity */}
                <View style={styles.cardHeader}>
                  <View style={styles.animalHeaderInfo}>
                    <Text style={styles.alertCategory}>WILDLIFE RISK ALERT</Text>
                    <Text style={styles.animalName}>
                      {item.animalName || 'Tracked Subject'}{' '}
                      {item.animalSpecies && (
                        <Text style={styles.animalSpecies}>
                          ({item.animalSpecies})
                        </Text>
                      )}
                    </Text>
                  </View>
                  <StatusBadge status={item.severity} size="small" />
                </View>

                {/* Details: Zone, Location, Detection Time */}
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>📍</Text>
                    <Text style={styles.detailText} numberOfLines={1}>
                      {item.zoneName || 'Risk Zone Perimeter'}
                    </Text>
                  </View>

                  {hasLocation && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailIcon}>🗺️</Text>
                      <Text style={styles.detailMonoText}>
                        {item.location!.latitude.toFixed(4)},{' '}
                        {item.location!.longitude.toFixed(4)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailIcon}>⏱️</Text>
                    <Text style={styles.detailText}>{formattedDate}</Text>
                  </View>
                </View>

                {/* Footer: Lifecycle Status & Actions */}
                <View style={styles.cardFooter}>
                  <View style={styles.statusGroup}>
                    <StatusBadge status={item.status} size="small" />
                    {item.locationRecordId && (
                      <View style={styles.telemetryMiniTag}>
                        <Text style={styles.telemetryMiniText}>🛰️ Ingested</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionButtonGroup}>
                    {isCommunityMember && (
                      <TouchableOpacity
                        style={styles.reportSightingBtn}
                        onPress={() => handleReportSightingCommunity(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.reportSightingBtnText}>
                          📢 Sighting
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.viewDetailBtn}
                      onPress={() => setSelectedAlertId(item.id)}
                      activeOpacity={0.8}
                      testID={`view-alert-${item.id}`}
                    >
                      <Text style={styles.viewDetailBtnText}>
                        {isRanger ? 'View & Respond ›' : 'Details ›'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </AppCard>
            );
          })
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
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E8E41',
  },
  offlineWarningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
    gap: 10,
  },
  offlineWarningIcon: {
    fontSize: 18,
  },
  offlineWarningContent: {
    flex: 1,
    gap: 4,
  },
  offlineWarningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  offlineWarningText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 15,
  },
  syncNowBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  syncNowBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  communityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
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
  filterWrapper: {
    backgroundColor: '#FAF7EE',
    borderBottomWidth: 1,
    borderBottomColor: '#D1B370',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
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
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  alertCard: {
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  animalHeaderInfo: {
    flex: 1,
    marginRight: 8,
  },
  alertCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A76D40',
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
    color: '#4B5563',
  },
  cardDetails: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E6DCB8',
    borderBottomWidth: 1,
    borderBottomColor: '#E6DCB8',
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    fontSize: 13,
  },
  detailText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  detailMonoText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1C2A1E',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryMiniTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  telemetryMiniText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  reportSightingBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reportSightingBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewDetailBtn: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#7F1D1D',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
