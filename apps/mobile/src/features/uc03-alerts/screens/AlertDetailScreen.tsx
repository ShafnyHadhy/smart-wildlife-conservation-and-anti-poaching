import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { AppHeader } from '../../../components/common/AppHeader';
import { AppCard } from '../../../components/common/AppCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { LoadingState } from '../../../components/common/LoadingState';
import { AuthUser } from '../../../services/authService';
import { QueuedMutation } from '../../../services/offlineQueue';
import { mobileAlertService } from '../services/alertService';
import {
  WildlifeRiskAlert,
  AlertStatus,
  ResponseStatus,
  RiskLevel,
  CreateAlertResponseDTO,
} from '../types';

interface AlertDetailScreenProps {
  alertId: string;
  onBack: () => void;
  isOnline?: boolean;
  onSyncNow?: () => void;
  user?: AuthUser;
  onAlertUpdated?: () => void;
}

const LIFECYCLE_STEPS: Array<{ key: AlertStatus; label: string }> = [
  { key: AlertStatus.ACTIVE, label: 'ACTIVE' },
  { key: AlertStatus.ACKNOWLEDGED, label: 'ACKNOWLEDGED' },
  { key: AlertStatus.RESPONDING, label: 'RESPONDING' },
  { key: AlertStatus.RESOLVED, label: 'RESOLVED' },
];

export function AlertDetailScreen({
  alertId,
  onBack,
  isOnline = true,
  onSyncNow,
  user,
  onAlertUpdated,
}: AlertDetailScreenProps) {
  const [alert, setAlert] = useState<WildlifeRiskAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending offline queued action for this alert
  const [pendingActions, setPendingActions] = useState<QueuedMutation[]>([]);

  // Response Form State
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isRanger = user?.role === 'RANGER' || !user?.role; // Default to ranger permissions
  const responderId = user?.id || 'aaaa0002-0000-0000-0000-000000000002'; // Default seeded ranger UUID

  const loadAlertDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await mobileAlertService.getAlertById(alertId);
      setAlert(data);

      const pending = await mobileAlertService.getPendingAlertActions(alertId);
      setPendingActions(pending);
    } catch (err: any) {
      console.warn('[AlertDetailScreen] Failed to load alert:', err);
      setError(err.message || 'Unable to load alert details.');
    } finally {
      setLoading(false);
    }
  }, [alertId]);

  useEffect(() => {
    loadAlertDetails();
  }, [loadAlertDetails]);

  // Determine available lifecycle transition based on alert.status
  const currentStatus = alert?.status;
  const isPendingOffline = pendingActions.length > 0;

  let nextActionConfig: {
    status: ResponseStatus;
    buttonLabel: string;
    defaultNote: string;
    description: string;
  } | null = null;

  if (currentStatus === AlertStatus.ACTIVE) {
    nextActionConfig = {
      status: ResponseStatus.INITIATED,
      buttonLabel: 'Acknowledge Alert',
      defaultNote: 'Alert acknowledged by ranger unit; preparing dispatch assessment.',
      description: 'Acknowledge this active geofence breach alert to mark it as seen.',
    };
  } else if (currentStatus === AlertStatus.ACKNOWLEDGED) {
    nextActionConfig = {
      status: ResponseStatus.IN_PROGRESS,
      buttonLabel: 'Start Response',
      defaultNote: 'Ranger team deployed to zone perimeter with deterrent equipment.',
      description: 'Dispatch ranger patrol to intercept and monitor wildlife movement.',
    };
  } else if (currentStatus === AlertStatus.RESPONDING) {
    nextActionConfig = {
      status: ResponseStatus.COMPLETED,
      buttonLabel: 'Resolve Alert',
      defaultNote: 'Animal safely guided away from settlement; boundary perimeter secured.',
      description: 'Mark alert resolved after successfully driving wildlife back into core sanctuary.',
    };
  }

  const handleOpenActionForm = () => {
    if (!nextActionConfig) return;
    setFormError(null);
    setActionNote(nextActionConfig.defaultNote);
    setShowActionForm(true);
  };

  const handleSubmitResponse = async () => {
    if (!nextActionConfig || !alert) return;

    const trimmedNote = actionNote.trim();
    if (trimmedNote.length < 3) {
      setFormError('Please enter at least 3 characters describing the action taken.');
      return;
    }

    // Prevent duplicate submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    const dto: CreateAlertResponseDTO = {
      alertId: alert.id,
      responderId,
      actionTaken: trimmedNote,
      status: nextActionConfig.status,
      notes: trimmedNote,
    };

    try {
      const res = await mobileAlertService.respondToAlert(alert.id, dto, isOnline);

      if (res.direct) {
        Alert.alert(
          'Action Confirmed',
          `Response recorded successfully. Alert is now ${
            nextActionConfig.status === ResponseStatus.INITIATED
              ? 'ACKNOWLEDGED'
              : nextActionConfig.status === ResponseStatus.IN_PROGRESS
              ? 'RESPONDING'
              : 'RESOLVED'
          }.`
        );
      } else {
        Alert.alert(
          'Action Queued Offline',
          'Device is currently offline. Your response action has been safely queued locally and will synchronize automatically once connectivity is restored.',
          onSyncNow ? [{ text: 'OK' }, { text: 'Sync Now', onPress: onSyncNow }] : undefined
        );
      }

      setShowActionForm(false);
      setActionNote('');
      await loadAlertDetails();
      if (onAlertUpdated) {
        onAlertUpdated();
      }
    } catch (err: any) {
      console.error('[AlertDetailScreen] Submission failed:', err);
      const errMsg = err.message || 'Server rejected response action.';
      setFormError(errMsg);
      Alert.alert('Response Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Alert Details"
          subtitle="Loading telemetry and risk data..."
          showBackButton={true}
          onBack={onBack}
        />
        <LoadingState message="Fetching live alert details from sanctuary server..." />
      </View>
    );
  }

  if (error || !alert) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Alert Details"
          subtitle="Error Loading Record"
          showBackButton={true}
          onBack={onBack}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Alert</Text>
          <Text style={styles.errorMessage}>{error || 'Alert not found.'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadAlertDetails}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry Loading</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCritical = alert.severity === RiskLevel.CRITICAL;
  const isHigh = alert.severity === RiskLevel.HIGH;

  return (
    <View style={styles.container}>
      <AppHeader
        title={alert.animalName || 'Wildlife Risk Alert'}
        subtitle={`${alert.severity} Severity • ${alert.status}`}
        showBackButton={true}
        onBack={onBack}
        rightAction={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadAlertDetails}
            activeOpacity={0.7}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        }
      />

      <ScreenContainer scrollable={true} contentContainerStyle={styles.content}>
        {/* Offline Queued Action Pending Notice */}
        {isPendingOffline && (
          <View style={styles.pendingQueueBanner}>
            <Text style={styles.pendingQueueIcon}>⏳</Text>
            <View style={styles.pendingQueueContent}>
              <Text style={styles.pendingQueueTitle}>
                Pending Offline Synchronization
              </Text>
              <Text style={styles.pendingQueueText}>
                You queued an action ({pendingActions[0]?.payload?.actionTaken || 'Response Action'}) while offline.
                This transition has not yet been confirmed by the server. Further lifecycle steps are locked until synchronization completes.
              </Text>
              {onSyncNow && isOnline && (
                <TouchableOpacity
                  style={styles.syncNowButton}
                  onPress={onSyncNow}
                  activeOpacity={0.8}
                >
                  <Text style={styles.syncNowButtonText}>Sync With Server Now ›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* 1. Primary Risk Card */}
        <AppCard variant="elevated" style={styles.primaryCard}>
          <View style={styles.cardRowBetween}>
            <View>
              <Text style={styles.animalNameText}>
                {alert.animalName || 'Tracked Subject'}
              </Text>
              <Text style={styles.speciesText}>
                {alert.animalSpecies || 'Monitored Wildlife'}
              </Text>
            </View>
            <StatusBadge status={alert.severity} size="medium" />
          </View>

          <View style={styles.divider} />

          {/* Risk Zone & Breach Summary */}
          <View style={styles.metaSection}>
            <Text style={styles.metaLabel}>BREACH RISK ZONE</Text>
            <Text style={styles.metaValueHighlight}>
              {alert.zoneName || 'Sanctuary Boundary / Buffer Zone'}
            </Text>
            {alert.notes ? (
              <Text style={styles.notesText}>{alert.notes}</Text>
            ) : null}
          </View>

          {/* Coordinates & Transmission Timestamp */}
          <View style={styles.coordBox}>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>LAT / LNG COORDINATES</Text>
              <Text style={styles.coordValue}>
                {alert.location
                  ? `${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}`
                  : 'Coordinates pending telemetry lock'}
              </Text>
            </View>
            <View style={styles.coordItem}>
              <Text style={styles.coordLabel}>DETECTION TIME</Text>
              <Text style={styles.coordValue}>
                {alert.generatedAt
                  ? new Date(alert.generatedAt).toLocaleString()
                  : 'Recent'}
              </Text>
            </View>
          </View>

          {/* Collar Metrics when provided by API */}
          {((alert as any).collarCode || (alert as any).collar?.deviceCode || (alert as any).batteryLevel !== undefined || (alert as any).lastTransmission) ? (
            <View style={styles.collarBox}>
              <Text style={styles.coordLabel}>COLLAR & TELEMETRY METRICS</Text>
              <Text style={styles.coordValue}>
                {[
                  ((alert as any).collarCode || (alert as any).collar?.deviceCode)
                    ? `Collar: ${(alert as any).collarCode || (alert as any).collar?.deviceCode}`
                    : null,
                  (alert as any).batteryLevel !== undefined
                    ? `Battery: ${(alert as any).batteryLevel}%`
                    : null,
                  (alert as any).lastTransmission
                    ? `Last Ping: ${new Date((alert as any).lastTransmission).toLocaleTimeString()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
          ) : null}

          {/* Telemetry / Simulation tag indicator */}
          {alert.locationRecordId ? (
            <View style={styles.telemetryTag}>
              <Text style={styles.telemetryTagText}>
                {((alert as any).isSimulated || alert.notes?.toLowerCase().includes('simulated'))
                  ? '🛰 Simulated Telemetry Transmission'
                  : '🛰 GPS Collar Telemetry Ingested'}
              </Text>
            </View>
          ) : null}
        </AppCard>

        {/* 2. Lifecycle Progression Stepper */}
        <AppCard style={styles.stepperCard}>
          <Text style={styles.sectionTitle}>ALERT RESPONSE LIFECYCLE</Text>

          <View style={styles.stepperRow}>
            {LIFECYCLE_STEPS.map((step, idx) => {
              const currentStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === alert.status);
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isPast && styles.stepCirclePast,
                      isCurrent && styles.stepCircleCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumber,
                        (isPast || isCurrent) && styles.stepNumberActive,
                      ]}
                    >
                      {isPast ? '✓' : idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isCurrent && styles.stepLabelCurrent,
                      isPast && styles.stepLabelPast,
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </AppCard>

        {/* 3. Action Workflow Section */}
        {isRanger && !isPendingOffline && (
          <AppCard style={styles.actionCard}>
            <Text style={styles.sectionTitle}>FIELD RESPONDER ACTIONS</Text>

            {nextActionConfig ? (
              <View style={styles.actionContent}>
                <Text style={styles.actionPromptText}>
                  {nextActionConfig.description}
                </Text>

                {!showActionForm ? (
                  <TouchableOpacity
                    style={[
                      styles.actionTriggerButton,
                      isCritical ? styles.criticalActionButton : styles.standardActionButton,
                    ]}
                    onPress={handleOpenActionForm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionTriggerButtonText}>
                      {nextActionConfig.buttonLabel} ›
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionForm}>
                    <Text style={styles.formInputLabel}>
                      Field Action Remarks / Notes *
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={actionNote}
                      onChangeText={(val) => {
                        setActionNote(val);
                        if (formError) setFormError(null);
                      }}
                      placeholder="Specify field action taken..."
                      multiline={true}
                      numberOfLines={3}
                      editable={!isSubmitting}
                      testID="action-note-input"
                    />

                    {formError ? (
                      <Text style={styles.formErrorText}>{formError}</Text>
                    ) : null}

                    <View style={styles.formButtonsRow}>
                      <TouchableOpacity
                        style={styles.cancelFormButton}
                        onPress={() => setShowActionForm(false)}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelFormButtonText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.submitFormButton,
                          isSubmitting && styles.submitFormButtonDisabled,
                        ]}
                        onPress={handleSubmitResponse}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                        testID="confirm-action-button"
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.submitFormButtonText}>
                            Confirm Action
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.resolvedInfoBox}>
                <Text style={styles.resolvedIcon}>✅</Text>
                <View>
                  <Text style={styles.resolvedTitle}>Alert Resolved & Closed</Text>
                  <Text style={styles.resolvedSubtitle}>
                    This risk alert has completed the full operational response lifecycle.
                  </Text>
                </View>
              </View>
            )}
          </AppCard>
        )}

        {/* 4. Response Audit History */}
        <AppCard style={styles.historyCard}>
          <Text style={styles.sectionTitle}>
            RESPONSE AUDIT TRAIL ({alert.responses?.length || 0})
          </Text>

          {(!alert.responses || alert.responses.length === 0) ? (
            <Text style={styles.emptyHistoryText}>
              No responder action has been logged yet for this alert.
            </Text>
          ) : (
            alert.responses.map((resp, index) => (
              <View key={resp.id || index} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.responderName}>
                    {resp.responderName || 'Duty Field Ranger'}
                  </Text>
                  <StatusBadge status={resp.status} size="small" />
                </View>
                <Text style={styles.actionTakenText}>{resp.actionTaken}</Text>
                <Text style={styles.respondedTimeText}>
                  {new Date(resp.respondedAt).toLocaleString()}
                </Text>
                {index < (alert.responses?.length || 0) - 1 && (
                  <View style={styles.historyDivider} />
                )}
              </View>
            ))
          )}
        </AppCard>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FAF7EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E8E41',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorIcon: {
    fontSize: 36,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  errorMessage: {
    fontSize: 14,
    color: '#854F26',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#3E8E41',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  pendingQueueBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  pendingQueueIcon: {
    fontSize: 22,
  },
  pendingQueueContent: {
    flex: 1,
    gap: 6,
  },
  pendingQueueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  pendingQueueText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  syncNowButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncNowButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  primaryCard: {
    padding: 16,
    gap: 12,
  },
  cardRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  animalNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C2A1E',
  },
  speciesText: {
    fontSize: 13,
    color: '#A76D40',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E6DCB8',
    marginVertical: 4,
  },
  metaSection: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A76D40',
    letterSpacing: 0.5,
  },
  metaValueHighlight: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  notesText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 2,
  },
  coordBox: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  collarBox: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  coordItem: {
    flex: 1,
    gap: 2,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854F26',
  },
  coordValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
    fontFamily: 'monospace',
  },
  telemetryTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  telemetryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#854F26',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stepperCard: {
    padding: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCirclePast: {
    backgroundColor: '#3E8E41',
  },
  stepCircleCurrent: {
    backgroundColor: '#A76D40',
    borderWidth: 2,
    borderColor: '#1C2A1E',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepLabelPast: {
    color: '#3E8E41',
  },
  stepLabelCurrent: {
    color: '#1C2A1E',
    fontWeight: '800',
  },
  actionCard: {
    padding: 16,
  },
  actionContent: {
    gap: 10,
  },
  actionPromptText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  actionTriggerButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  standardActionButton: {
    backgroundColor: '#3E8E41',
  },
  criticalActionButton: {
    backgroundColor: '#E11D48',
  },
  actionTriggerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  actionForm: {
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1B370',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#1C2A1E',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formErrorText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
  },
  formButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelFormButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1B370',
    backgroundColor: '#FFFFFF',
  },
  cancelFormButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitFormButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#3E8E41',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFormButtonDisabled: {
    opacity: 0.6,
  },
  submitFormButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  resolvedInfoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resolvedIcon: {
    fontSize: 24,
  },
  resolvedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  resolvedSubtitle: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  historyCard: {
    padding: 16,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  historyItem: {
    gap: 4,
    paddingVertical: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  actionTakenText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  respondedTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
  },
});
