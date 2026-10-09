import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RiskLevel,
} from '../../features/uc03-alerts/types';
import { mobileAlertService } from '../../features/uc03-alerts/services/alertService';
import { AlertDetailScreen } from '../../features/uc03-alerts/screens/AlertDetailScreen';
import {
  HiOutlineExclamationTriangle,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineArrowPath,
  HiOutlineSpeakerWave,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';
import {
  TbShieldCheck,
  TbAlertTriangle,
  TbWifiOff,
  TbSatellite,
} from 'react-icons/tb';
import { GiElephant, GiPawPrint } from 'react-icons/gi';

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

  // Count active/open alerts for title subtitle badge
  const activeAlertsCount = useMemo(() => {
    return alerts.filter(
      (a) => a.status === AlertStatus.ACTIVE || a.status === AlertStatus.RESPONDING
    ).length;
  }, [alerts]);

  // Master-detail navigation: render AlertDetailScreen when an alert is selected
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
            accessibilityLabel="Refresh Alerts"
          >
            <HiOutlineArrowPath
              size={13}
              color="#2D5A27"
              style={refreshing ? styles.rotatingIcon : undefined}
            />
            <Text style={styles.refreshBtnText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Top Notifications Banner (Inspired by reference image) */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryLeft}>
          <View style={styles.brandBadge}>
            <TbShieldCheck size={16} color="#FFFFFF" />
            <Text style={styles.brandBadgeText}>WildGuard</Text>
          </View>
          <View style={styles.activeDot} />
          <Text style={styles.summaryText}>
            {activeAlertsCount === 1
              ? '1 active threat alert today'
              : `${activeAlertsCount} active alerts today`}
          </Text>
        </View>

        {!isOnline && (
          <View style={styles.offlineChip}>
            <TbWifiOff size={12} color="#854F26" />
            <Text style={styles.offlineChipText}>Offline Cache</Text>
          </View>
        )}
      </View>

      {/* Offline Status Warning Notice */}
      {!isOnline && (
        <View style={styles.offlineWarningBanner}>
          <TbWifiOff size={18} color="#92400E" />
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

      {/* Community Early Warning Advisory */}
      {isCommunityMember && (
        <View style={styles.communityBanner}>
          <HiOutlineShieldCheck size={18} color="#1E40AF" />
          <Text style={styles.communityBannerText}>
            Automated early-warning proximity alerts for village safety. If you spot wildlife near your farm, tap{' '}
            <Text style={{ fontWeight: '700' }}>Report Sighting</Text> to alert park rangers.
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

      {/* Main Alerts Feed */}
      <ScreenContainer scrollable={true} contentContainerStyle={styles.listContent}>
        {loading && !refreshing ? (
          <LoadingState message="Connecting to sanctuary server & loading risk alerts..." />
        ) : error ? (
          <View style={styles.errorCard}>
            <TbAlertTriangle size={32} color="#DC2626" />
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
            const isCritical = item.severity === RiskLevel.CRITICAL;
            const isHigh = item.severity === RiskLevel.HIGH;
            const isElephant =
              item.animalSpecies?.toLowerCase().includes('elephant') ||
              item.animalName?.toLowerCase().includes('elephant') ||
              item.animalName?.toLowerCase().includes('walagamba') ||
              item.animalName?.toLowerCase().includes('raja');

            const formattedDate = item.generatedAt
              ? new Date(item.generatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <AppCard
                key={item.id}
                variant="elevated"
                style={[
                  styles.alertCard,
                  isCritical && styles.alertCardCritical,
                ]}
              >
                {/* 1. Header Pill Row (Inspired by reference image) */}
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.severityBannerPill,
                      isCritical
                        ? styles.severityPillCritical
                        : isHigh
                        ? styles.severityPillHigh
                        : styles.severityPillMedium,
                    ]}
                  >
                    <HiOutlineExclamationTriangle
                      size={13}
                      color={isCritical ? '#BE123C' : isHigh ? '#B45309' : '#047857'}
                    />
                    <Text
                      style={[
                        styles.severityBannerText,
                        isCritical
                          ? styles.severityTextCritical
                          : isHigh
                          ? styles.severityTextHigh
                          : styles.severityTextMedium,
                      ]}
                    >
                      {item.severity} RISK ALERT
                    </Text>
                  </View>

                  <View style={styles.cardStatusPill}>
                    <View
                      style={[
                        styles.statusGlowDot,
                        item.status === AlertStatus.ACTIVE
                          ? styles.statusDotActive
                          : item.status === AlertStatus.RESPONDING
                          ? styles.statusDotResponding
                          : styles.statusDotResolved,
                      ]}
                    />
                    <Text style={styles.cardStatusText}>{item.status}</Text>
                  </View>
                </View>

                {/* 2. Animal Identity Row with Avatar (Inspired by reference image) */}
                <View style={styles.animalProfileRow}>
                  <View
                    style={[
                      styles.animalAvatarBox,
                      isCritical && styles.animalAvatarBoxCritical,
                    ]}
                  >
                    {isElephant ? (
                      <GiElephant size={24} color="#2D5A27" />
                    ) : (
                      <GiPawPrint size={22} color="#2D5A27" />
                    )}
                  </View>

                  <View style={styles.animalInfoColumn}>
                    <Text style={styles.animalHeadline} numberOfLines={2}>
                      <Text style={styles.animalHeadlineBold}>
                        {item.animalName || 'Tracked Wildlife'}
                      </Text>{' '}
                      has entered a {item.severity.toLowerCase()}-risk zone
                    </Text>
                    <Text style={styles.animalMetaSub}>
                      {item.animalSpecies || 'Species Monitored'} • Time:{' '}
                      {formattedDate}
                    </Text>
                  </View>
                </View>

                {/* 3. 2x2 Clean Data Grid (Inspired by reference image) */}
                <View style={styles.dataGrid}>
                  <View style={styles.dataTile}>
                    <Text style={styles.dataTileLabel}>RISK ZONE</Text>
                    <Text style={styles.dataTileValue} numberOfLines={1}>
                      {item.zoneName || 'Sanctuary Buffer'}
                    </Text>
                  </View>

                  <View style={styles.dataTile}>
                    <Text style={styles.dataTileLabel}>RISK TYPE</Text>
                    <Text style={styles.dataTileValue} numberOfLines={1}>
                      Human-Wildlife
                    </Text>
                  </View>

                  <View style={styles.dataTile}>
                    <Text style={styles.dataTileLabel}>RISK LEVEL</Text>
                    <Text
                      style={[
                        styles.dataTileValue,
                        isCritical
                          ? { color: '#E11D48', fontWeight: '800' }
                          : isHigh
                          ? { color: '#D97706', fontWeight: '800' }
                          : { color: '#2D5A27', fontWeight: '800' },
                      ]}
                    >
                      {item.severity}
                    </Text>
                  </View>

                  <View style={styles.dataTile}>
                    <Text style={styles.dataTileLabel}>STATUS</Text>
                    <Text style={styles.dataTileValue}>{item.status}</Text>
                  </View>
                </View>

                {/* Optional Telemetry Coordinates Summary Row */}
                {item.location && (
                  <View style={styles.locationStrip}>
                    <HiOutlineMapPin size={13} color="#2D5A27" />
                    <Text style={styles.locationStripText}>
                      Coordinates: {item.location.latitude.toFixed(4)},{' '}
                      {item.location.longitude.toFixed(4)}
                    </Text>
                    {item.locationRecordId && (
                      <View style={styles.telemetryTag}>
                        <TbSatellite size={11} color="#065F46" />
                        <Text style={styles.telemetryTagText}>Locked</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* 4. Action Button (Full-width Forest Green button from reference image) */}
                <View style={styles.actionRow}>
                  {isCommunityMember && (
                    <TouchableOpacity
                      style={styles.communityActionBtn}
                      onPress={() => handleReportSightingCommunity(item)}
                      activeOpacity={0.8}
                    >
                      <HiOutlineSpeakerWave size={14} color="#FFFFFF" />
                      <Text style={styles.communityActionBtnText}>Sighting</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.primaryActionBtn,
                      isCommunityMember && { flex: 1 },
                    ]}
                    onPress={() => setSelectedAlertId(item.id)}
                    activeOpacity={0.85}
                    testID={`view-alert-${item.id}`}
                  >
                    <HiOutlineEye size={15} color="#FFFFFF" />
                    <Text style={styles.primaryActionBtnText}>
                      {isRanger ? 'VIEW & RESPOND ›' : 'VIEW ALERT ›'}
                    </Text>
                  </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D5A27',
  },
  rotatingIcon: {
    opacity: 0.7,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D2',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2D5A27',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#854F26',
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  filterTabActive: {
    backgroundColor: '#2D5A27',
    borderColor: '#2D5A27',
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
    paddingBottom: 36,
    gap: 14,
  },
  alertCard: {
    padding: 14,
    gap: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  alertCardCritical: {
    borderColor: '#FECDD3',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityPillCritical: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  severityPillHigh: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  severityPillMedium: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  severityBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  severityTextCritical: {
    color: '#BE123C',
  },
  severityTextHigh: {
    color: '#B45309',
  },
  severityTextMedium: {
    color: '#047857',
  },
  cardStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusGlowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusDotActive: {
    backgroundColor: '#EF4444',
  },
  statusDotResponding: {
    backgroundColor: '#F59E0B',
  },
  statusDotResolved: {
    backgroundColor: '#10B981',
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  animalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  animalAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EBF3EA',
    borderWidth: 1,
    borderColor: '#C6DCC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalAvatarBoxCritical: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  animalInfoColumn: {
    flex: 1,
    gap: 2,
  },
  animalHeadline: {
    fontSize: 14,
    color: '#1C2A1E',
    lineHeight: 19,
  },
  animalHeadlineBold: {
    fontWeight: '900',
    fontSize: 15,
  },
  animalMetaSub: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dataTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#E8E2D2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  dataTileLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#854F26',
    letterSpacing: 0.4,
  },
  dataTileValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E2D2',
  },
  locationStripText: {
    fontSize: 11,
    color: '#374151',
    flex: 1,
    fontFamily: 'monospace',
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  telemetryTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  communityActionBtn: {
    backgroundColor: '#1E3A8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  communityActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: '#2D5A27',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#1C4B27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
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
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
