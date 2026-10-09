import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { HiChevronRight, HiCalendar, HiMapPin, HiArrowPath } from 'react-icons/hi2';
import { AppHeader } from '../../../components/common/AppHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AuthUser } from '../../../services/authService';
import { Patrol, PatrolStatus } from '../types';
import { patrolMobileService } from '../services/patrolMobileService';

interface PatrolListScreenProps {
  user?: AuthUser;
  isOnline?: boolean;
  onSelectPatrol: (patrol: Patrol) => void;
  onGoHome?: () => void;
}

type FilterType = 'ALL' | 'ACTIVE' | 'PLANNED' | 'COMPLETED';

export function PatrolListScreen({
  user,
  isOnline = true,
  onSelectPatrol,
  onGoHome,
}: PatrolListScreenProps) {
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatrols = useCallback(async () => {
    setError(null);
    try {
      // Authenticated ranger retrieves their assigned patrols
      const data = await patrolMobileService.getPatrols(user?.id);
      setPatrols(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load assigned patrols. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPatrols();
  }, [loadPatrols]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPatrols();
  };

  const filteredPatrols = patrols.filter((p) => {
    if (filter === 'ALL') return true;
    return p.status === filter;
  });

  const activeCount = patrols.filter((p) => p.status === PatrolStatus.ACTIVE).length;
  const plannedCount = patrols.filter((p) => p.status === PatrolStatus.PLANNED).length;

  return (
    <View style={styles.container}>
      <AppHeader
        title="Ranger Patrols"
        subtitle={user?.fullName ? `${user.fullName} • Assigned Operations` : 'Assigned Field Operations'}
        showBackButton={Boolean(onGoHome)}
        onBack={onGoHome}
        rightAction={
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <HiArrowPath size={18} color="#14532D" />
          </TouchableOpacity>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['ALL', 'ACTIVE', 'PLANNED', 'COMPLETED'] as FilterType[]).map((tab) => {
          const isActive = filter === tab;
          let count = 0;
          if (tab === 'ALL') count = patrols.length;
          else if (tab === 'ACTIVE') count = activeCount;
          else if (tab === 'PLANNED') count = plannedCount;
          else count = patrols.filter((p) => p.status === PatrolStatus.COMPLETED).length;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Offline indicator if working from cache */}
        {!isOnline && (
          <View style={styles.offlineWarningBanner}>
            <Text style={styles.offlineWarningText}>
              ⚡ Offline Mode: Displaying locally cached patrol assignments.
            </Text>
          </View>
        )}

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadPatrols}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading state */}
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#14532D" />
            <Text style={styles.loadingText}>Loading assigned patrols...</Text>
          </View>
        ) : filteredPatrols.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>No Patrols Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'ALL'
                ? 'No patrols are currently assigned to your ranger unit.'
                : `No patrols found with status "${filter}".`}
            </Text>
            <TouchableOpacity style={styles.emptyRefreshBtn} onPress={loadPatrols}>
              <Text style={styles.emptyRefreshText}>Refresh Patrols</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Patrol Cards */
          filteredPatrols.map((patrol) => {
            const startDateStr = new Date(patrol.startTime).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                key={patrol.id}
                style={[
                  styles.patrolCard,
                  patrol.status === PatrolStatus.ACTIVE && styles.patrolCardActive,
                ]}
                onPress={() => onSelectPatrol(patrol)}
                activeOpacity={0.8}
              >
                {/* Card Top Row: Code & Status */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.patrolCode}>{patrol.patrolCode}</Text>
                  <StatusBadge status={patrol.status} size="small" />
                </View>

                {/* Route & Park Name */}
                <View style={styles.metaRow}>
                  <HiMapPin size={16} color="#15803D" />
                  <Text style={styles.routeName}>
                    {patrol.routeName || 'Assigned Route'}
                  </Text>
                </View>
                <Text style={styles.parkName}>
                  {patrol.parkName || 'National Park Sanctuary'}
                </Text>

                {/* Scheduled / Start Time */}
                <View style={styles.timeRow}>
                  <HiCalendar size={15} color="#6B7280" />
                  <Text style={styles.timeText}>
                    {patrol.status === PatrolStatus.PLANNED ? 'Scheduled: ' : 'Started: '}
                    {startDateStr}
                  </Text>
                </View>

                {/* Footer: Coverage & Action */}
                <View style={styles.cardFooter}>
                  <View style={styles.coverageBox}>
                    <Text style={styles.coverageLabel}>Coverage:</Text>
                    <Text style={styles.coverageValue}>
                      {Number(patrol.coverageScore || 0).toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.actionPrompt}>
                    <Text
                      style={[
                        styles.actionText,
                        patrol.status === PatrolStatus.ACTIVE && styles.actionTextActive,
                      ]}
                    >
                      {patrol.status === PatrolStatus.ACTIVE
                        ? 'Track Live Patrol'
                        : patrol.status === PatrolStatus.PLANNED
                        ? 'View & Start'
                        : 'View Log'}
                    </Text>
                    <HiChevronRight
                      size={16}
                      color={patrol.status === PatrolStatus.ACTIVE ? '#15803D' : '#6B7280'}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  refreshIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#14532D',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  offlineWarningBanner: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },
  retryButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B5563',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyRefreshBtn: {
    backgroundColor: '#14532D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyRefreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  patrolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  patrolCardActive: {
    borderColor: '#22C55E',
    borderWidth: 1.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patrolCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  parkName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 22,
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  coverageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverageLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  coverageValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  actionTextActive: {
    color: '#15803D',
    fontWeight: '700',
  },
});
