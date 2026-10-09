import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {
  HiPlay,
  HiCheckCircle,
  HiMapPin,
  HiArrowPath,
  HiExclamationTriangle,
  HiClock,
} from 'react-icons/hi2';
import { AppHeader } from '../../../components/common/AppHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { AuthUser } from '../../../services/authService';
import { Patrol, PatrolRoute, PatrolStatus, Waypoint } from '../types';
import { patrolMobileService } from '../services/patrolMobileService';
import { usePatrolTracking } from '../hooks/usePatrolTracking';
import { PatrolRouteMap } from '../components/PatrolRouteMap';

interface ActivePatrolScreenProps {
  patrol: Patrol;
  user?: AuthUser;
  isOnline?: boolean;
  onBack: () => void;
  onPatrolUpdated?: (updated: Patrol) => void;
}

export function ActivePatrolScreen({
  patrol: initialPatrol,
  user,
  isOnline = true,
  onBack,
  onPatrolUpdated,
}: ActivePatrolScreenProps) {
  const [patrol, setPatrol] = useState<Patrol>(initialPatrol);
  const [route, setRoute] = useState<PatrolRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [waypointNote, setWaypointNote] = useState<string>('');
  const [showNoteInput, setShowNoteInput] = useState<boolean>(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [showCompleteConfirmation, setShowCompleteConfirmation] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const reloadPatrolRef = useRef<() => Promise<void>>(async () => undefined);
  const completionInFlightRef = useRef(false);

  // Sync latest patrol details from backend
  const reloadPatrol = useCallback(async () => {
    try {
      const refreshed = await patrolMobileService.getPatrolById(patrol.id);
      setPatrol(refreshed);
      setRefreshError(null);
      if (onPatrolUpdated) onPatrolUpdated(refreshed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not refresh patrol details.';
      setRefreshError(message);
    }
  }, [patrol.id, onPatrolUpdated]);

  useEffect(() => {
    reloadPatrolRef.current = reloadPatrol;
  }, [reloadPatrol]);

  useEffect(() => {
    if (patrol.status !== PatrolStatus.ACTIVE || !isOnline) return;
    const refreshInterval = setInterval(() => {
      void reloadPatrolRef.current();
    }, 30_000);
    return () => clearInterval(refreshInterval);
  }, [patrol.status, isOnline]);

  // Load route with its planned checkpoints
  useEffect(() => {
    let isMounted = true;
    async function fetchRoute() {
      if (!patrol.patrolRouteId) {
        setLoadingRoute(false);
        return;
      }
      try {
        const r = await patrolMobileService.getPatrolRouteById(patrol.patrolRouteId);
        if (isMounted) setRoute(r);
      } catch (err) {
        console.warn('[ActivePatrolScreen] Could not load route:', err);
      } finally {
        if (isMounted) setLoadingRoute(false);
      }
    }
    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [patrol.patrolRouteId]);

  // Handle new waypoint recorded callback
  const handleWaypointRecorded = useCallback(
    (newWp: Waypoint) => {
      setPatrol((prev) => {
        const existing = prev.waypoints || [];
        const updated = {
          ...prev,
          waypoints: [...existing, newWp],
        };
        if (onPatrolUpdated) onPatrolUpdated(updated);
        return updated;
      });
      // Also reload in background to update coverage score from server
      reloadPatrol();
    },
    [onPatrolUpdated, reloadPatrol]
  );

  // Patrol tracking hook
  const {
    currentLocation,
    gpsStatus,
    gpsError,
    isRecording,
    visitedCheckpointIds,
    refreshGps,
    recordCurrentWaypoint,
    calculateDistanceToCheckpoint,
  } = usePatrolTracking(patrol, route, handleWaypointRecorded, isOnline);

  // Elapsed time tracker for ACTIVE patrols
  useEffect(() => {
    if (patrol.status === PatrolStatus.ACTIVE) {
      const startTimeMs = new Date(patrol.startTime).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        const diffSecs = Math.max(0, Math.floor((now - startTimeMs) / 1000));
        setElapsedSeconds(diffSecs);
      };
      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else if (patrol.status === PatrolStatus.COMPLETED && patrol.endTime) {
      const startMs = new Date(patrol.startTime).getTime();
      const endMs = new Date(patrol.endTime).getTime();
      setElapsedSeconds(Math.max(0, Math.floor((endMs - startMs) / 1000)));
    }
  }, [patrol.status, patrol.startTime, patrol.endTime]);

  const formatTimer = (secs: number): string => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remSecs = secs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  // Handler: Start Patrol
  const handleStartPatrol = () => {
    Alert.alert(
      'Start Patrol',
      `Begin active patrol for ${patrol.patrolCode}? Server start time will be stamped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Patrol',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await patrolMobileService.startPatrol(patrol.id);
              setPatrol(updated);
              if (onPatrolUpdated) onPatrolUpdated(updated);
              Alert.alert('Patrol Started', 'Patrol is now ACTIVE. GPS tracking is live.');
            } catch (err: any) {
              Alert.alert('Start Error', err?.message || 'Could not start patrol.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handler: Record Waypoint
  const handleRecordWaypoint = async () => {
    if (gpsStatus === 'PERMISSION_DENIED') {
      Alert.alert(
        'GPS Permission Required',
        'Please grant location permissions to record GPS coordinates.',
        [{ text: 'Retry Permission', onPress: refreshGps }]
      );
      return;
    }

    setActionLoading(true);
    try {
      const note = waypointNote.trim() || undefined;
      await recordCurrentWaypoint(note);
      setWaypointNote('');
      setShowNoteInput(false);
      Alert.alert('Waypoint Recorded', 'GPS breadcrumb coordinate successfully saved.');
    } catch (err: any) {
      Alert.alert('Waypoint Error', err?.message || 'Failed to record waypoint.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Complete Patrol
  const handleCompletePatrol = () => {
    if (actionLoading || completionInFlightRef.current) return;
    setCompletionError(null);
    setShowCompleteConfirmation(true);
  };

  const confirmCompletePatrol = async () => {
    if (completionInFlightRef.current || actionLoading) return;
    completionInFlightRef.current = true;
    setShowCompleteConfirmation(false);
    setCompletionError(null);
    setActionLoading(true);
    try {
      const updated = await patrolMobileService.completePatrol(patrol.id);
      if (updated.status !== PatrolStatus.COMPLETED) {
        throw new Error('The server did not confirm patrol completion. Refresh the patrol and try again.');
      }
      setPatrol(updated);
      if (onPatrolUpdated) onPatrolUpdated(updated);
    } catch (err: unknown) {
      setCompletionError(err instanceof Error ? err.message : 'Could not complete patrol.');
    } finally {
      completionInFlightRef.current = false;
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={patrol.patrolCode}
        subtitle={patrol.parkName || 'National Park'}
        showBackButton={true}
        onBack={onBack}
        rightAction={<StatusBadge status={patrol.status} size="small" />}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Offline indicator */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              ⚡ Working Off-Grid: Updates will be cached on device until network is restored.
            </Text>
          </View>
        )}
        {refreshError && (
          <View style={styles.gpsErrorRow}>
            <HiExclamationTriangle size={16} color="#D97706" />
            <Text style={styles.gpsErrorText}>{refreshError}</Text>
          </View>
        )}

        {/* Operational Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewRow}>
            <View style={styles.overviewCol}>
              <Text style={styles.metaLabel}>Corridor Route</Text>
              <Text style={styles.metaValue}>{patrol.routeName || 'Assigned Corridor'}</Text>
            </View>

            <View style={styles.overviewColRight}>
              <Text style={styles.metaLabel}>Assigned Ranger</Text>
              <Text style={styles.metaValue}>{patrol.rangerName || user?.fullName || 'Ranger Unit'}</Text>
            </View>
          </View>

          {/* Time & Duration row */}
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <HiClock size={18} color="#15803D" />
              <Text style={styles.timerLabel}>
                {patrol.status === PatrolStatus.COMPLETED
                  ? 'Total Patrol Duration'
                  : patrol.status === PatrolStatus.ACTIVE
                  ? 'Active Elapsed Time'
                  : 'Status'}
              </Text>
            </View>
            <Text style={styles.timerValue}>
              {patrol.status === PatrolStatus.PLANNED ? 'Not Started' : formatTimer(elapsedSeconds)}
            </Text>
          </View>
        </View>

        {/* GPS Live Telemetry Card (For ACTIVE or PLANNED) */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsHeader}>
            <View style={styles.gpsTitleRow}>
              <HiMapPin size={18} color={gpsStatus === 'LIVE' ? '#16A34A' : '#D97706'} />
              <Text style={styles.gpsTitle}>GPS Field Telemetry</Text>
            </View>

            {/* GPS Status pill */}
            <View
              style={[
                styles.gpsPill,
                gpsStatus === 'LIVE' && styles.gpsPillLive,
                gpsStatus === 'PERMISSION_DENIED' && styles.gpsPillDanger,
                gpsStatus === 'STALE' && styles.gpsPillWarning,
              ]}
            >
              <Text
                style={[
                  styles.gpsPillText,
                  gpsStatus === 'LIVE' && styles.gpsPillTextLive,
                  gpsStatus === 'PERMISSION_DENIED' && styles.gpsPillTextDanger,
                ]}
              >
                {gpsStatus}
              </Text>
            </View>
          </View>

          {/* Coordinates readout */}
          {currentLocation ? (
            <View style={styles.coordsReadout}>
              <Text style={styles.coordsText}>
                Latitude: <Text style={styles.coordsBold}>{currentLocation.latitude.toFixed(6)}°</Text>
              </Text>
              <Text style={styles.coordsText}>
                Longitude: <Text style={styles.coordsBold}>{currentLocation.longitude.toFixed(6)}°</Text>
              </Text>
              {currentLocation.accuracyMeters !== undefined && (
                <Text style={styles.accuracyText}>
                  Accuracy: ±{Math.round(currentLocation.accuracyMeters)}m
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.acquiringText}>
              {gpsStatus === 'ACQUIRING'
                ? 'Acquiring satellite lock...'
                : gpsStatus === 'OFF'
                ? 'GPS inactive. Start patrol to begin tracking.'
                : 'No live GPS fix available.'}
            </Text>
          )}

          {/* GPS error or permission banner */}
          {gpsError && (
            <View style={styles.gpsErrorRow}>
              <HiExclamationTriangle size={16} color="#DC2626" />
              <Text style={styles.gpsErrorText}>{gpsError}</Text>
            </View>
          )}

          {/* Refresh / Retry button */}
          <TouchableOpacity
            style={styles.refreshGpsBtn}
            onPress={refreshGps}
            activeOpacity={0.7}
          >
            <HiArrowPath size={14} color="#15803D" />
            <Text style={styles.refreshGpsText}>Refresh GPS Position</Text>
          </TouchableOpacity>
        </View>

        {/* Primary Action Buttons based on lifecycle */}
        <View style={styles.actionsContainer}>
          {patrol.status === PatrolStatus.PLANNED && (
            <TouchableOpacity
              style={styles.startHeroButton}
              onPress={handleStartPatrol}
              disabled={actionLoading || !isOnline}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <HiPlay size={20} color="#FFFFFF" />
                  <Text style={styles.startHeroButtonText}>Start Patrol Now</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {patrol.status === PatrolStatus.ACTIVE && (
            <View style={styles.activeActionsRow}>
              {/* Record Waypoint button */}
              <TouchableOpacity
                style={styles.recordWaypointButton}
                onPress={() => setShowNoteInput(!showNoteInput)}
                disabled={actionLoading || isRecording || !isOnline}
                activeOpacity={0.8}
              >
                {isRecording ? (
                  <ActivityIndicator color="#15803D" />
                ) : (
                  <>
                    <HiMapPin size={18} color="#15803D" />
                    <Text style={styles.recordWaypointText}>
                      {showNoteInput ? 'Cancel Note' : 'Record Waypoint'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Complete Patrol button */}
              <TouchableOpacity
                style={styles.completePatrolButton}
                onPress={handleCompletePatrol}
                disabled={actionLoading || !isOnline}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <HiCheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.completePatrolText}>Complete Patrol</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {showCompleteConfirmation && patrol.status === PatrolStatus.ACTIVE && (
            <View
              style={{
                padding: 14,
                marginTop: 12,
                borderRadius: 12,
                backgroundColor: '#FEFCE8',
                borderWidth: 1,
                borderColor: '#EAB308',
              }}
              accessibilityRole="alert"
            >
              <Text style={{ color: '#713F12', fontWeight: '600', marginBottom: 10 }}>
                Complete patrol {patrol.patrolCode}? The server will record the end time and final coverage.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setShowCompleteConfirmation(false)}
                  disabled={actionLoading}
                  accessibilityRole="button"
                >
                  <Text style={{ color: '#44403C', padding: 8 }}>Keep Patrol Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void confirmCompletePatrol()}
                  disabled={actionLoading || !isOnline}
                  accessibilityRole="button"
                >
                  <Text style={{ color: '#B91C1C', fontWeight: '700', padding: 8 }}>
                    {actionLoading ? 'Completing…' : 'Confirm Completion'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {completionError && patrol.status === PatrolStatus.ACTIVE && (
            <View
              style={{
                padding: 12,
                marginTop: 12,
                borderRadius: 10,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FCA5A5',
              }}
              accessibilityRole="alert"
            >
              <Text style={{ color: '#991B1B' }}>{completionError}</Text>
            </View>
          )}

          {/* Optional Note input for dropping a waypoint with comment */}
          {showNoteInput && patrol.status === PatrolStatus.ACTIVE && (
            <View style={styles.noteInputCard}>
              <Text style={styles.noteInputLabel}>Add Field Observation Note (Optional):</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Broken perimeter fence, fresh animal tracks..."
                value={waypointNote}
                onChangeText={setWaypointNote}
                maxLength={250}
              />
              <TouchableOpacity
                style={styles.submitWaypointBtn}
                onPress={handleRecordWaypoint}
                disabled={actionLoading || !isOnline}
              >
                <Text style={styles.submitWaypointText}>Save & Log Waypoint</Text>
              </TouchableOpacity>
            </View>
          )}

          {patrol.status === PatrolStatus.COMPLETED && (
            <View style={styles.completedSummaryBanner}>
              <HiCheckCircle size={24} color="#15803D" />
              <View style={styles.completedTextCol}>
                <Text style={styles.completedTitle}>Patrol Concluded Successfully</Text>
                <Text style={styles.completedSubtitle}>
                  Logged {patrol.waypoints?.length || 0} GPS breadcrumb coordinates. Final coverage score:{' '}
                  {Number(patrol.coverageScore || 0).toFixed(1)}%.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Route checkpoints & breadcrumbs list */}
        {loadingRoute ? (
          <ActivityIndicator color="#14532D" style={{ marginVertical: 16 }} />
        ) : (
          <PatrolRouteMap
            patrol={patrol}
            route={route}
            currentLocation={currentLocation}
            visitedCheckpointIds={visitedCheckpointIds}
            calculateDistanceToCheckpoint={calculateDistanceToCheckpoint}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textAlign: 'center',
  },
  overviewCard: {
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
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overviewCol: {
    flex: 1,
  },
  overviewColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  timerValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803D',
    fontFamily: 'monospace',
  },
  gpsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  gpsPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  gpsPillLive: {
    backgroundColor: '#DCFCE7',
  },
  gpsPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  gpsPillDanger: {
    backgroundColor: '#FEE2E2',
  },
  gpsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  gpsPillTextLive: {
    color: '#15803D',
  },
  gpsPillTextDanger: {
    color: '#B91C1C',
  },
  coordsReadout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 13,
    color: '#4B5563',
  },
  coordsBold: {
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  accuracyText: {
    fontSize: 12,
    color: '#6B7280',
    width: '100%',
  },
  acquiringText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  gpsErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  gpsErrorText: {
    fontSize: 12,
    color: '#991B1B',
    flex: 1,
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  refreshGpsText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  actionsContainer: {
    marginBottom: 4,
  },
  startHeroButton: {
    backgroundColor: '#15803D',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#15803D',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  startHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recordWaypointButton: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  recordWaypointText: {
    color: '#15803D',
    fontSize: 14,
    fontWeight: '700',
  },
  completePatrolButton: {
    flex: 1,
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completePatrolText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noteInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noteInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  submitWaypointBtn: {
    backgroundColor: '#15803D',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitWaypointText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  completedSummaryBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completedTextCol: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  completedSubtitle: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
});
