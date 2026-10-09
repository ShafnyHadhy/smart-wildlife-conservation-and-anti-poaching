import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
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
  RiskZone,
  WildlifeAnimal,
} from '../types';
import { WildlifeAlertMap } from '../components/WildlifeAlertMap';
import {
  HiOutlineExclamationTriangle,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineShieldCheck,
  HiChevronRight,
} from 'react-icons/hi2';
import {
  TbSatellite,
  TbBattery3,
  TbWalk,
  TbAlertTriangle,
  TbWifiOff,
  TbMap,
} from 'react-icons/tb';
import { GiElephant, GiPawPrint } from 'react-icons/gi';

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
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    try {
      return Dimensions?.get ? Dimensions.get('window').width : 375;
    } catch {
      return 375;
    }
  });

  useEffect(() => {
    const handler = ({ window }: { window: { width: number } }) => {
      setWindowWidth(window.width);
    };
    const sub = Dimensions?.addEventListener ? Dimensions.addEventListener('change', handler) : undefined;
    return () => {
      sub?.remove?.();
    };
  }, []);

  const isTablet = windowWidth >= 768;

  const [alert, setAlert] = useState<WildlifeRiskAlert | null>(null);
  const [zones, setZones] = useState<RiskZone[]>([]);
  const [animals, setAnimals] = useState<WildlifeAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phone view mode: 'ALL' or 'MAP_ONLY'
  const [phoneViewMode, setPhoneViewMode] = useState<'ALL' | 'MAP_ONLY'>('ALL');

  // Pending offline queued action for this alert
  const [pendingActions, setPendingActions] = useState<QueuedMutation[]>([]);

  // Response Form State
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);

  const isRanger = user?.role === 'RANGER' || !user?.role;
  const responderId = user?.id || 'aaaa0002-0000-0000-0000-000000000002';

  const loadAlertDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [data, pending, loadedZones, loadedAnimals] = await Promise.all([
        mobileAlertService.getAlertById(alertId),
        mobileAlertService.getPendingAlertActions(alertId),
        mobileAlertService.getRiskZones(isOnline).catch(() => []),
        mobileAlertService.getAnimals(isOnline).catch(() => []),
      ]);

      setAlert(data);
      setPendingActions(pending);
      setZones(loadedZones);
      setAnimals(loadedAnimals);
    } catch (err: any) {
      console.warn('[AlertDetailScreen] Failed to load alert:', err);
      setError(err.message || 'Unable to load alert details.');
    } finally {
      setLoading(false);
    }
  }, [alertId, isOnline]);

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
    options: Array<{ title: string; note: string; icon: React.ReactNode }>;
  } | null = null;

  if (currentStatus === AlertStatus.ACTIVE) {
    nextActionConfig = {
      status: ResponseStatus.INITIATED,
      buttonLabel: 'Acknowledge Alert',
      defaultNote: 'Alert acknowledged by ranger unit; preparing field dispatch.',
      description: 'Acknowledge this active geofence breach alert to mark it as seen.',
      options: [
        {
          title: 'Dispatched to Location (Recommended)',
          note: 'Ranger patrol dispatched immediately to perimeter boundary to intercept animal.',
          icon: <TbWalk size={16} color="#FFFFFF" />,
        },
        {
          title: 'Investigating / Assessing Threat',
          note: 'Assessing buffer breach severity and verifying nearby human settlement density.',
          icon: <HiOutlineMagnifyingGlass size={16} color="#2D5A27" />,
        },
        {
          title: 'Monitoring Movement',
          note: 'Maintaining visual observation on collar telemetry trajectory toward corridor.',
          icon: <HiOutlineEye size={16} color="#2D5A27" />,
        },
      ],
    };
  } else if (currentStatus === AlertStatus.ACKNOWLEDGED) {
    nextActionConfig = {
      status: ResponseStatus.IN_PROGRESS,
      buttonLabel: 'Start Response',
      defaultNote: 'Ranger team deployed to zone perimeter with deterrent equipment.',
      description: 'Dispatch ranger patrol to intercept and monitor wildlife movement.',
      options: [
        {
          title: 'Field Team Deployed (Recommended)',
          note: 'Ranger team deployed to zone perimeter with deterrent equipment.',
          icon: <TbWalk size={16} color="#FFFFFF" />,
        },
        {
          title: 'Perimeter Barrier Monitoring',
          note: 'Patrol stationed at agricultural fence line to redirect herd.',
          icon: <HiOutlineEye size={16} color="#2D5A27" />,
        },
      ],
    };
  } else if (currentStatus === AlertStatus.RESPONDING) {
    nextActionConfig = {
      status: ResponseStatus.COMPLETED,
      buttonLabel: 'Resolve Alert',
      defaultNote: 'Animal safely guided away from settlement; boundary perimeter secured.',
      description: 'Mark alert resolved after successfully driving wildlife back into core sanctuary.',
      options: [
        {
          title: 'Safely Guided Back to Core (Recommended)',
          note: 'Animal safely guided away from settlement; boundary perimeter secured.',
          icon: <HiOutlineCheckCircle size={16} color="#FFFFFF" />,
        },
        {
          title: 'Subject Vacated Risk Area',
          note: 'Collar GPS confirmed animal returned into sanctuary interior on its own.',
          icon: <HiOutlineCheckCircle size={16} color="#2D5A27" />,
        },
      ],
    };
  }

  const handleOpenActionForm = () => {
    if (!nextActionConfig) return;
    setFormError(null);
    setSelectedPresetIndex(0);
    setActionNote(nextActionConfig.options[0]?.note || nextActionConfig.defaultNote);
    setShowActionForm(true);
  };

  const handleSelectPreset = (index: number) => {
    if (!nextActionConfig) return;
    setSelectedPresetIndex(index);
    setActionNote(nextActionConfig.options[index]?.note || nextActionConfig.defaultNote);
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
          title="Wildlife Risk Alert"
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
          title="Wildlife Risk Alert"
          subtitle="Error Loading Record"
          showBackButton={true}
          onBack={onBack}
        />
        <View style={styles.errorContainer}>
          <TbAlertTriangle size={36} color="#DC2626" />
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
  const isElephant =
    alert.animalSpecies?.toLowerCase().includes('elephant') ||
    alert.animalName?.toLowerCase().includes('elephant') ||
    alert.animalName?.toLowerCase().includes('walagamba') ||
    alert.animalName?.toLowerCase().includes('raja');

  const formattedDetectionTime = alert.generatedAt
    ? new Date(alert.generatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  // Render the Map component
  const renderMapBlock = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderAccent} />
        <Text style={styles.sectionHeaderTitle}>GPS LOCATION & GEOFENCE MAP</Text>
      </View>
      <WildlifeAlertMap
        alert={alert}
        zones={zones}
        animals={animals}
        height={isTablet ? 380 : 270}
        onRecenter={loadAlertDetails}
      />
    </View>
  );

  // Render Left/Primary Details
  const renderDetailsBlock = () => (
    <>
      {/* Offline Queued Action Pending Notice */}
      {isPendingOffline && (
        <View style={styles.pendingQueueBanner}>
          <TbWifiOff size={22} color="#D97706" />
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

      {/* 1. Top Severity Notification Banner (Inspired by reference image) */}
      <View
        style={[
          styles.topBanner,
          isCritical
            ? styles.topBannerCritical
            : isHigh
            ? styles.topBannerHigh
            : styles.topBannerMedium,
        ]}
      >
        <View style={styles.topBannerLeft}>
          <HiOutlineExclamationTriangle
            size={16}
            color={isCritical ? '#BE123C' : isHigh ? '#B45309' : '#065F46'}
          />
          <Text
            style={[
              styles.topBannerTitle,
              isCritical
                ? styles.topBannerTitleCritical
                : isHigh
                ? styles.topBannerTitleHigh
                : styles.topBannerTitleMedium,
            ]}
          >
            {alert.severity} RISK ALERT
          </Text>
        </View>
        <Text style={styles.topBannerTime}>
          {alert.status} • {formattedDetectionTime}
        </Text>
      </View>

      {/* 2. Animal Profile Card (Inspired by reference image) */}
      <AppCard variant="elevated" style={styles.animalProfileCard}>
        <View style={styles.animalCardHeader}>
          <View style={styles.animalAvatarSquare}>
            {isElephant ? (
              <GiElephant size={28} color="#2D5A27" />
            ) : (
              <GiPawPrint size={24} color="#2D5A27" />
            )}
          </View>
          <View style={styles.animalIdentityColumn}>
            <Text style={styles.speciesCategoryLabel}>SPECIES IDENTIFICATION</Text>
            <Text style={styles.animalMainName}>
              {alert.animalName || 'Tracked Subject'}
            </Text>
            <Text style={styles.animalSpeciesSub}>
              {alert.animalSpecies || 'Monitored Wildlife'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 2x2 Telemetry Summary Grid (Inspired by reference image) */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>GPS COLLAR ID</Text>
            <Text style={styles.metaCellValue}>
              {(alert as any).collarCode ||
                (alert as any).collar?.deviceCode ||
                'COLLAR-ACTIVE'}
            </Text>
          </View>

          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>LAST UPDATED</Text>
            <Text style={styles.metaCellValue}>{formattedDetectionTime}</Text>
          </View>

          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>TRACKING STATUS</Text>
            <View style={styles.trackingStatusRow}>
              <View style={styles.greenSignalDot} />
              <Text style={styles.trackingStatusActive}>Active</Text>
            </View>
          </View>

          <View style={styles.metaCell}>
            <Text style={styles.metaCellLabel}>ZONE ENTRY</Text>
            <Text style={styles.metaCellValue}>{formattedDetectionTime}</Text>
          </View>
        </View>
      </AppCard>

      {/* 3. Section: RISK INFORMATION (Inspired by reference image with green vertical accent) */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderAccent} />
          <Text style={styles.sectionHeaderTitle}>BREACH RISK ZONE</Text>
        </View>

        <AppCard style={styles.infoTableCard}>
          <View style={styles.tableRow}>
            <Text style={styles.tableRowLabel}>Risk Zone</Text>
            <Text style={styles.tableRowValueBold}>
              {alert.zoneName || 'Sanctuary Buffer Zone'}
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableRowLabel}>Risk Type</Text>
            <Text style={styles.tableRowValue}>
              Human-Wildlife Conflict / Boundary Breach
            </Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableRowLabel}>Risk Level</Text>
            <StatusBadge status={alert.severity} size="small" />
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableRowLabel}>Current Status</Text>
            <StatusBadge status={alert.status} size="small" />
          </View>

          {alert.location && (
            <View style={styles.tableRow}>
              <Text style={styles.tableRowLabel}>Coordinates</Text>
              <Text style={styles.tableRowMono}>
                {alert.location.latitude.toFixed(4)},{' '}
                {alert.location.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {alert.locationRecordId && (
            <View style={styles.telemetryIngestRow}>
              <TbSatellite size={14} color="#065F46" />
              <Text style={styles.telemetryIngestText}>
                {alert.notes?.toLowerCase().includes('simulated')
                  ? 'Simulated Telemetry Transmission Ingested'
                  : 'Live GPS Collar Telemetry Ingested'}
              </Text>
            </View>
          )}
        </AppCard>
      </View>

      {/* On compact phones, render Map inline inside the scrollable view unless user selected MAP_ONLY */}
      {!isTablet && renderMapBlock()}

      {/* 4. Section: ALERT RESPONSE LIFECYCLE Stepper */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderAccent} />
          <Text style={styles.sectionHeaderTitle}>ALERT RESPONSE LIFECYCLE</Text>
        </View>

        <AppCard style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {LIFECYCLE_STEPS.map((step, idx) => {
              const currentStepIdx = LIFECYCLE_STEPS.findIndex(
                (s) => s.key === alert.status
              );
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
                    {isPast ? (
                      <HiOutlineCheckCircle size={16} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepNumber,
                          (isPast || isCurrent) && styles.stepNumberActive,
                        ]}
                      >
                        {idx + 1}
                      </Text>
                    )}
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
      </View>

      {/* 5. Section: FIELD RESPONDER ACTIONS (Inspired by reference Screen 3) */}
      {isRanger && !isPendingOffline && (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderAccent} />
            <Text style={styles.sectionHeaderTitle}>FIELD RESPONDER ACTIONS</Text>
          </View>

          <AppCard style={styles.actionCard}>
            {nextActionConfig ? (
              <View style={styles.actionContent}>
                <Text style={styles.actionPromptText}>
                  {nextActionConfig.description}
                </Text>

                {!showActionForm ? (
                  <TouchableOpacity
                    style={[
                      styles.actionTriggerButton,
                      isCritical
                        ? styles.criticalActionButton
                        : styles.standardActionButton,
                    ]}
                    onPress={handleOpenActionForm}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionTriggerButtonText}>
                      {nextActionConfig.buttonLabel} ›
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionForm}>
                    <Text style={styles.formInputLabel}>
                      Select Standard Field Action:
                    </Text>

                    {/* Action Presets inspired by Screen 3 */}
                    <View style={styles.presetsList}>
                      {nextActionConfig.options.map((opt, idx) => {
                        const isSelected = selectedPresetIndex === idx;
                        return (
                          <TouchableOpacity
                            key={idx}
                            style={[
                              styles.presetOption,
                              isSelected && styles.presetOptionSelected,
                            ]}
                            onPress={() => handleSelectPreset(idx)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.presetIconCircle,
                                isSelected && styles.presetIconCircleSelected,
                              ]}
                            >
                              {opt.icon}
                            </View>
                            <Text
                              style={[
                                styles.presetOptionTitle,
                                isSelected && styles.presetOptionTitleSelected,
                              ]}
                            >
                              {opt.title}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

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

                    {formError && (
                      <View style={styles.errorInlineRow}>
                        <HiOutlineExclamationTriangle size={14} color="#E11D48" />
                        <Text style={styles.formErrorText}>{formError}</Text>
                      </View>
                    )}

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
                <HiOutlineCheckCircle size={28} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resolvedTitle}>Alert Resolved & Closed</Text>
                  <Text style={styles.resolvedSubtitle}>
                    This risk alert has completed the full operational response lifecycle.
                  </Text>
                </View>
              </View>
            )}
          </AppCard>
        </View>
      )}

      {/* 6. Section: RESPONSE AUDIT TRAIL */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderAccent} />
          <Text style={styles.sectionHeaderTitle}>
            RESPONSE AUDIT TRAIL ({alert.responses?.length || 0})
          </Text>
        </View>

        <AppCard style={styles.historyCard}>
          {!alert.responses || alert.responses.length === 0 ? (
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
                <View style={styles.historyTimeRow}>
                  <HiOutlineClock size={11} color="#9CA3AF" />
                  <Text style={styles.respondedTimeText}>
                    {new Date(resp.respondedAt).toLocaleString()}
                  </Text>
                </View>
                {index < (alert.responses?.length || 0) - 1 && (
                  <View style={styles.historyDivider} />
                )}
              </View>
            ))
          )}
        </AppCard>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Wildlife Risk Alert"
        subtitle={`${alert.severity} Severity • ${alert.status}`}
        showBackButton={true}
        onBack={onBack}
        rightAction={
          <View style={styles.headerRightGroup}>
            {/* Live Indicator Pill (Inspired by reference image) */}
            <View
              style={[
                styles.liveBadgePill,
                !isOnline && styles.liveBadgePillOffline,
              ]}
            >
              <View
                style={[
                  styles.liveDot,
                  !isOnline && styles.liveDotOffline,
                ]}
              />
              <Text
                style={[
                  styles.liveBadgeText,
                  !isOnline && styles.liveBadgeTextOffline,
                ]}
              >
                {isOnline ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadAlertDetails}
              activeOpacity={0.7}
              title="Refresh Alert"
            >
              <HiOutlineArrowPath size={14} color="#2D5A27" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Tablet / Wide-screen Side-by-Side Responsive Layout */}
      {isTablet ? (
        <View style={styles.tabletSplitContainer}>
          <View style={styles.tabletMapColumn}>{renderMapBlock()}</View>
          <View style={styles.tabletDetailsColumn}>
            <ScreenContainer
              scrollable={true}
              contentContainerStyle={styles.content}
            >
              {renderDetailsBlock()}
            </ScreenContainer>
          </View>
        </View>
      ) : (
        /* Phone Stacked View */
        <ScreenContainer
          scrollable={true}
          contentContainerStyle={styles.content}
        >
          {renderDetailsBlock()}
        </ScreenContainer>
      )}
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
    paddingBottom: 48,
    gap: 16,
  },
  tabletSplitContainer: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  tabletMapColumn: {
    flex: 1.1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabletDetailsColumn: {
    flex: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveBadgePillOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveDotOffline: {
    backgroundColor: '#F59E0B',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  liveBadgeTextOffline: {
    color: '#854F26',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: '#FAF7EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  topBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  topBannerCritical: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  topBannerHigh: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  topBannerMedium: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  topBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topBannerTitleCritical: {
    color: '#BE123C',
  },
  topBannerTitleHigh: {
    color: '#B45309',
  },
  topBannerTitleMedium: {
    color: '#047857',
  },
  topBannerTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  animalProfileCard: {
    padding: 16,
    borderRadius: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  animalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  animalAvatarSquare: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#EBF3EA',
    borderWidth: 1,
    borderColor: '#C6DCC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalIdentityColumn: {
    flex: 1,
    gap: 2,
  },
  speciesCategoryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#854F26',
    letterSpacing: 0.5,
  },
  animalMainName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C2A1E',
  },
  animalSpeciesSub: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E2D2',
    marginVertical: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#E8E2D2',
    borderRadius: 8,
    padding: 10,
    gap: 3,
  },
  metaCellLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#854F26',
    letterSpacing: 0.4,
  },
  metaCellValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  trackingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenSignalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  trackingStatusActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderAccent: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#2D5A27',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2D5A27',
    letterSpacing: 0.6,
  },
  infoTableCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  tableRowValue: {
    fontSize: 12,
    color: '#1C2A1E',
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  tableRowValueBold: {
    fontSize: 13,
    color: '#1C2A1E',
    fontWeight: '800',
  },
  tableRowMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#1C2A1E',
    fontWeight: '700',
  },
  telemetryIngestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  telemetryIngestText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  stepperCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#2D5A27',
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
    fontSize: 9,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepLabelPast: {
    color: '#2D5A27',
    fontWeight: '700',
  },
  stepLabelCurrent: {
    color: '#1C2A1E',
    fontWeight: '800',
  },
  actionCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  actionContent: {
    gap: 12,
  },
  actionPromptText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  actionTriggerButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#2D5A27',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  standardActionButton: {
    backgroundColor: '#2D5A27',
  },
  criticalActionButton: {
    backgroundColor: '#E11D48',
  },
  actionTriggerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
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
  presetsList: {
    gap: 8,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D2',
    padding: 10,
    borderRadius: 8,
  },
  presetOptionSelected: {
    backgroundColor: '#2D5A27',
    borderColor: '#2D5A27',
  },
  presetIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF3EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconCircleSelected: {
    backgroundColor: '#1C4B27',
  },
  presetOptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1C2A1E',
    flex: 1,
  },
  presetOptionTitleSelected: {
    color: '#FFFFFF',
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
  errorInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    backgroundColor: '#2D5A27',
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
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
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
    lineHeight: 16,
  },
  historyCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE5D8',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  historyItem: {
    gap: 4,
    paddingVertical: 8,
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
  historyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  pendingQueueBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
  },
  pendingQueueContent: {
    flex: 1,
    gap: 6,
  },
  pendingQueueTitle: {
    fontSize: 13,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
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
    backgroundColor: '#2D5A27',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
