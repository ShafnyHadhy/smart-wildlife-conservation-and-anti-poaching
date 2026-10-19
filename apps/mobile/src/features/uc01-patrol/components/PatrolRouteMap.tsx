import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { HiCheck, HiMapPin, HiClock, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { Patrol, PatrolRoute, Waypoint } from '../types';
import { LocationReading } from '../hooks/usePatrolTracking';

interface PatrolRouteMapProps {
  patrol: Patrol;
  route?: PatrolRoute | null;
  currentLocation?: LocationReading | null;
  visitedCheckpointIds: string[];
  calculateDistanceToCheckpoint?: (cp: Waypoint) => number | null;
}

export function PatrolRouteMap({
  patrol,
  route,
  currentLocation,
  visitedCheckpointIds,
  calculateDistanceToCheckpoint,
}: PatrolRouteMapProps) {
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'breadcrumbs'>('checkpoints');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const plannedCheckpoints = route?.waypoints || [];
  const recordedWaypoints = patrol.waypoints || [];

  const visitedCount = visitedCheckpointIds.length;
  const totalCheckpoints = plannedCheckpoints.length;
  const coveragePercent =
    totalCheckpoints > 0 ? Math.round((visitedCount / totalCheckpoints) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <HiMapPin size={20} color="#14532D" />
          <Text style={styles.headerTitle}>Route & Checkpoint Verification</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.expandButton}
          activeOpacity={0.7}
        >
          {isExpanded ? (
            <HiChevronUp size={20} color="#4B5563" />
          ) : (
            <HiChevronDown size={20} color="#4B5563" />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Metric Banner */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>
            Checkpoints: {visitedCount}/{totalCheckpoints} Visited
          </Text>
          <Text style={styles.progressPercent}>{coveragePercent}% Coverage</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, coveragePercent)}%` }]} />
        </View>
      </View>

      {isExpanded && (
        <>
          {/* Subtabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'checkpoints' && styles.tabButtonActive]}
              onPress={() => setActiveTab('checkpoints')}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'checkpoints' && styles.tabButtonTextActive]}
              >
                Planned Checkpoints ({totalCheckpoints})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'breadcrumbs' && styles.tabButtonActive]}
              onPress={() => setActiveTab('breadcrumbs')}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabButtonText, activeTab === 'breadcrumbs' && styles.tabButtonTextActive]}
              >
                GPS Breadcrumbs ({recordedWaypoints.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Planned Route Checkpoints */}
          {activeTab === 'checkpoints' && (
            <View style={styles.listContainer}>
              {plannedCheckpoints.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No planned checkpoints registered for this corridor.</Text>
                </View>
              ) : (
                plannedCheckpoints.map((cp, idx) => {
                  const isVisited = visitedCheckpointIds.includes(cp.id);
                  const distanceMeters = calculateDistanceToCheckpoint
                    ? calculateDistanceToCheckpoint(cp)
                    : null;

                  return (
                    <View
                      key={cp.id || `cp-${idx}`}
                      style={[styles.checkpointCard, isVisited && styles.checkpointCardVisited]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.seqBadge}>
                          <Text style={styles.seqText}>#{cp.sequenceOrder || idx + 1}</Text>
                        </View>
                        <View style={styles.checkpointDetails}>
                          <Text style={styles.checkpointName}>
                            {cp.notes || `Checkpoint #${cp.sequenceOrder || idx + 1}`}
                          </Text>
                          <Text style={styles.coordsText}>
                            {typeof cp.latitude === 'number' ? cp.latitude.toFixed(5) : cp.latitude},{' '}
                            {typeof cp.longitude === 'number' ? cp.longitude.toFixed(5) : cp.longitude}
                          </Text>
                        </View>

                        {isVisited ? (
                          <View style={styles.visitedBadge}>
                            <HiCheck size={14} color="#166534" />
                            <Text style={styles.visitedText}>VISITED</Text>
                          </View>
                        ) : (
                          <View style={styles.pendingBadge}>
                            <Text style={styles.pendingText}>PENDING</Text>
                          </View>
                        )}
                      </View>

                      {distanceMeters !== null && !isVisited && (
                        <View style={styles.distanceRow}>
                          <Text style={styles.distanceText}>
                            📍 {distanceMeters < 1000 ? `${distanceMeters}m away` : `${(distanceMeters / 1000).toFixed(1)}km away`}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Tab 2: Actual Recorded GPS Breadcrumbs */}
          {activeTab === 'breadcrumbs' && (
            <View style={styles.listContainer}>
              {recordedWaypoints.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>
                    No GPS breadcrumbs recorded yet. Start tracking or record a waypoint during active patrol.
                  </Text>
                </View>
              ) : (
                recordedWaypoints.map((wp, idx) => {
                  const dateStr = wp.recordedAt
                    ? new Date(wp.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Unknown';

                  return (
                    <View key={wp.id || `wp-${idx}`} style={styles.breadcrumbCard}>
                      <View style={styles.breadcrumbHeader}>
                        <View style={styles.breadcrumbDot} />
                        <Text style={styles.breadcrumbTitle}>
                          Point #{wp.sequenceOrder || idx + 1}
                        </Text>
                        <View style={styles.breadcrumbTime}>
                          <HiClock size={12} color="#6B7280" />
                          <Text style={styles.timeText}>{dateStr}</Text>
                        </View>
                      </View>
                      <Text style={styles.breadcrumbCoords}>
                        Lat: {typeof wp.latitude === 'number' ? wp.latitude.toFixed(6) : wp.latitude} • Lng: {typeof wp.longitude === 'number' ? wp.longitude.toFixed(6) : wp.longitude}
                      </Text>
                      {wp.notes ? <Text style={styles.breadcrumbNotes}>"{wp.notes}"</Text> : null}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  expandButton: {
    padding: 4,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#15803D',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#15803D',
  },
  listContainer: {
    gap: 8,
  },
  emptyBox: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  checkpointCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checkpointCardVisited: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seqBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seqText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  checkpointDetails: {
    flex: 1,
  },
  checkpointName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  coordsText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  visitedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  distanceRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  distanceText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  breadcrumbCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breadcrumbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  breadcrumbTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  breadcrumbTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  breadcrumbCoords: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  breadcrumbNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#4B5563',
    marginTop: 4,
  },
});
