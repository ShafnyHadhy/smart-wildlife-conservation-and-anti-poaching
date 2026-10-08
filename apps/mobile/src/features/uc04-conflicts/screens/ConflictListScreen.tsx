import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { AppHeader } from '../../../components/common/AppHeader';
import { AppCard } from '../../../components/common/AppCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConflictReport, ConflictStatus } from '../types';
import { mobileConflictService } from '../services/conflictService';
import { AuthUser } from '../../../services/authService';

export interface EnrichedConflictReport extends ConflictReport {
  isPendingSync?: boolean;
}

interface ConflictListScreenProps {
  onBack?: () => void;
  onNewReportPress?: () => void;
  onSyncPress?: () => void;
  user?: AuthUser;
  initialFilter?: ConflictStatus | 'ALL' | 'PENDING_SYNC';
}

const MITIGATION_PRESETS = [
  'Dispatch Elephant Chaser Unit (ECU)',
  'Deploy Acoustic Thunder Flashes (Elephant Deterrent)',
  'Inspect & Repair Solar Electric Fence Line',
  'Agricultural Crop Compensation Survey',
  'Coordinate Rapid Response Escort',
  'Provide Flare Kit to Village Head',
];

const STATUS_PIPELINE: { status: ConflictStatus; label: string; icon: string; stepNumber: number }[] = [
  { status: ConflictStatus.SUBMITTED, label: 'Submitted', icon: '📝', stepNumber: 1 },
  { status: ConflictStatus.UNDER_REVIEW, label: 'Under Review', icon: '🔍', stepNumber: 2 },
  { status: ConflictStatus.RESPONDING, label: 'Responding', icon: '🚨', stepNumber: 3 },
  { status: ConflictStatus.RESOLVED, label: 'Resolved', icon: '✅', stepNumber: 4 },
];

export function ConflictListScreen({
  onBack,
  onNewReportPress,
  onSyncPress,
  user,
  initialFilter = 'ALL',
}: ConflictListScreenProps) {
  const [reports, setReports] = useState<EnrichedConflictReport[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<EnrichedConflictReport | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ConflictStatus | 'ALL' | 'PENDING_SYNC'>(initialFilter);
  const [filterMyReportsOnly, setFilterMyReportsOnly] = useState<boolean>(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Triage update form state
  const [targetStatus, setTargetStatus] = useState<ConflictStatus>(ConflictStatus.SUBMITTED);
  const [mitigationAction, setMitigationAction] = useState<string>('');
  const [triageNotes, setTriageNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const isRanger = user?.role === 'RANGER';
  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [remoteReports, pendingOps] = await Promise.all([
        mobileConflictService.getConflictReports(),
        mobileConflictService.getPendingOfflineConflicts(),
      ]);

      const pendingMapped: EnrichedConflictReport[] = pendingOps.map((op) => ({
        id: op.clientMutationId,
        communityMemberId: op.payload.communityMemberId,
        parkId: op.payload.parkId,
        conflictType: op.payload.conflictType,
        description: op.payload.description,
        latitude: op.payload.latitude,
        longitude: op.payload.longitude,
        status: ConflictStatus.SUBMITTED,
        severity: op.payload.severity || 'MEDIUM',
        reportedAt: op.payload.reportedAt || op.createdAt,
        createdAt: op.createdAt,
        updatedAt: op.createdAt,
        reporterName: op.payload.reporterName || user?.fullName || 'Local Villager',
        locationName: op.payload.locationName,
        isPendingSync: true,
      }));

      const combined: EnrichedConflictReport[] = [
        ...pendingMapped,
        ...remoteReports.filter((r) => !pendingMapped.some((p) => p.id === r.clientMutationId)),
      ];
      setReports(combined);
      setPendingCount(pendingOps.length);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    if (onSyncPress) {
      setIsSyncing(true);
      try {
        await onSyncPress();
        await loadData();
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleOpenDetail = (item: EnrichedConflictReport) => {
    setSelectedReport(item);
    setTargetStatus(item.status);
    setMitigationAction(item.mitigationAction || MITIGATION_PRESETS[0]);
    setTriageNotes(item.triageNotes || '');
  };

  const handleSaveStatusUpdate = async (overrideStatus?: ConflictStatus) => {
    if (!selectedReport) return;
    const finalStatus = overrideStatus || targetStatus;

    try {
      setIsUpdating(true);
      const updated = await mobileConflictService.updateConflictStatus(selectedReport.id, {
        status: finalStatus,
        triageNotes: triageNotes.trim() || undefined,
        mitigationAction: mitigationAction.trim() || undefined,
      });

      setSelectedReport(updated);
      setTargetStatus(updated.status);
      Alert.alert(
        'Action Recorded',
        `Conflict report status changed to "${finalStatus.replace(/_/g, ' ')}".\nCommunity member can now track this live update.`
      );
      await loadData();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update report status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter reports
  const displayedReports = reports.filter((item) => {
    if (statusFilter === 'PENDING_SYNC') {
      return !!item.isPendingSync;
    }
    if (statusFilter !== 'ALL') {
      if (item.isPendingSync) return false;
      if (item.status !== statusFilter) return false;
    }
    if (filterMyReportsOnly && user) {
      const matchId = item.communityMemberId === user.id;
      const matchName = user.fullName && item.reporterName === user.fullName;
      if (!matchId && !matchName) return false;
    }
    return true;
  });

  // Render Single Report Detail / Action Screen
  if (selectedReport) {
    const currentStepIndex = STATUS_PIPELINE.findIndex((s) => s.status === selectedReport.status);
    const effectiveStepIndex = selectedReport.status === ConflictStatus.CLOSED ? 3 : Math.max(0, currentStepIndex);

    const getStatusExplanation = () => {
      switch (selectedReport.status) {
        case ConflictStatus.SUBMITTED:
          return 'Report received by Central Command. Awaiting Ranger review and dispatch.';
        case ConflictStatus.UNDER_REVIEW:
          return 'A Wildlife Ranger has accepted this report and is assessing field situation & urgency.';
        case ConflictStatus.RESPONDING:
          return 'Ranger response team has been dispatched to your area with active deterrent equipment.';
        case ConflictStatus.RESOLVED:
        case ConflictStatus.CLOSED:
          return 'Threat neutralized and perimeter verified. Incident safely resolved.';
        default:
          return 'Report logged in system.';
      }
    };

    return (
      <View style={styles.container}>
        <AppHeader
          title="Report Details"
          subtitle={`Report #${selectedReport.id.slice(0, 8)} • ${selectedReport.conflictType.replace(/_/g, ' ')}`}
          showBackButton={true}
          onBack={() => {
            setSelectedReport(null);
            loadData();
          }}
        />

        <ScreenContainer scrollable={true}>
          {selectedReport.isPendingSync && (
            <AppCard variant="highlight" style={styles.detailOfflineBanner}>
              <View style={styles.detailOfflineRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.detailOfflineTitle}>💾 Offline Queued Report</Text>
                  <Text style={styles.detailOfflineDesc}>
                    This conflict report is stored on your device. Once network connection is active, tap Sync to transmit to central command.
                  </Text>
                </View>
                {onSyncPress ? (
                  <TouchableOpacity
                    style={styles.queueSyncBtn}
                    onPress={async () => {
                      await handleSync();
                      setSelectedReport(null);
                    }}
                    disabled={isSyncing}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.queueSyncBtnText}>
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </AppCard>
          )}

          {/* Visual Status Progress Stepper */}
          <AppCard variant="elevated" style={styles.stepperCard}>
            <View style={styles.stepperHeader}>
              <Text style={styles.stepperTitle}>Live Triage Pipeline</Text>
              {selectedReport.isPendingSync ? (
                <StatusBadge status="PENDING SYNC" size="small" variant="warning" />
              ) : (
                <StatusBadge status={selectedReport.status} size="small" />
              )}
            </View>

            <View style={styles.pipelineRow}>
              {STATUS_PIPELINE.map((step, idx) => {
                const isResolved =
                  selectedReport.status === ConflictStatus.RESOLVED ||
                  selectedReport.status === ConflictStatus.CLOSED;
                const isPassed = isResolved || idx < effectiveStepIndex;
                const isCurrent = !isResolved && idx === effectiveStepIndex;
                const showCheck = isPassed;

                return (
                  <React.Fragment key={step.status}>
                    <View style={styles.stepItem}>
                      <View
                        style={[
                          styles.stepCircle,
                          isCurrent && styles.stepCircleActive,
                          isPassed && styles.stepCirclePassed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stepIconText,
                            (isCurrent || isPassed) && styles.stepIconTextHighlight,
                          ]}
                        >
                          {showCheck ? '✓' : step.stepNumber}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.stepLabel,
                          isCurrent && styles.stepLabelActive,
                          isPassed && styles.stepLabelPassed,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                    {idx < STATUS_PIPELINE.length - 1 && (
                      <View
                        style={[
                          styles.stepConnector,
                          (isResolved || idx < effectiveStepIndex) && styles.stepConnectorPassed,
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            <View style={styles.statusExplainerBox}>
              <Text style={styles.statusExplainerText}>
                ℹ️ {getStatusExplanation()}
              </Text>
            </View>
          </AppCard>

          {/* Incident Details Card */}
          <AppCard style={styles.detailCard}>
            <Text style={styles.sectionSubtitle}>Incident Information</Text>

            <View style={styles.detailGridRow}>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>CONFLCT TYPE</Text>
                <Text style={styles.metaValue}>
                  {selectedReport.conflictType.replace(/_/g, ' ')}
                </Text>
              </View>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>SEVERITY</Text>
                <Text style={styles.metaValue}>{selectedReport.severity || 'MEDIUM'}</Text>
              </View>
            </View>

            <View style={styles.detailGridRow}>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>REPORTER</Text>
                <Text style={styles.metaValue}>
                  {selectedReport.reporterName || 'Local Villager'}
                </Text>
              </View>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>VILLAGE / SECTOR</Text>
                <Text style={styles.metaValue}>
                  {selectedReport.villageName || 'Park Buffer Zone'}
                </Text>
              </View>
            </View>

            <View style={styles.detailGridRow}>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>PHONE NUMBER</Text>
                <Text style={styles.metaValue}>
                  {selectedReport.reporterPhone || 'Not provided'}
                </Text>
              </View>
              <View style={styles.detailGridCol}>
                <Text style={styles.metaLabel}>GPS FIX</Text>
                <Text style={styles.metaValue}>
                  {Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <Text style={styles.metaLabel}>INCIDENT DESCRIPTION</Text>
            <Text style={styles.detailDescText}>{selectedReport.description}</Text>

            {(selectedReport.cropTypeLost || selectedReport.estimatedDamageLkr) && (
              <View style={styles.damageBox}>
                <Text style={styles.damageTitle}>🌾 Crop Damage Assessment</Text>
                {selectedReport.cropTypeLost ? (
                  <Text style={styles.damageItem}>
                    Crop Affected: <Text style={styles.boldSpan}>{selectedReport.cropTypeLost}</Text>
                  </Text>
                ) : null}
                {selectedReport.estimatedDamageLkr ? (
                  <Text style={styles.damageItem}>
                    Estimated Loss: <Text style={styles.boldSpan}>LKR {Number(selectedReport.estimatedDamageLkr).toLocaleString()}</Text>
                  </Text>
                ) : null}
              </View>
            )}
          </AppCard>

          {/* COMMUNITY MEMBER: Live Ranger Updates View */}
          {isCommunityMember && (
            <AppCard variant="highlight" style={styles.communityActionCard}>
              <Text style={styles.sectionSubtitle}>🛡️ Ranger Response & Field Action</Text>
              <View style={styles.actionDetailItem}>
                <Text style={styles.metaLabel}>DEPLOYED MITIGATION ACTION</Text>
                <Text style={styles.metaValueHighlight}>
                  {selectedReport.mitigationAction || 'Standard Wildlife Deterrent Patrol'}
                </Text>
              </View>

              <View style={styles.actionDetailItem}>
                <Text style={styles.metaLabel}>OFFICER TRIAGE NOTES</Text>
                <Text style={styles.notesText}>
                  {selectedReport.triageNotes || 'Rangers are coordinating with the buffer station.'}
                </Text>
              </View>

              <View style={styles.safetyNoticeBox}>
                <Text style={styles.safetyNoticeText}>
                  ⚠️ For immediate life-threatening elephant encounters, dial Hotline: 1990 or 047-2220140.
                </Text>
              </View>
            </AppCard>
          )}

          {/* RANGER: Action Control Desk */}
          {!isCommunityMember && (
            <AppCard variant="elevated" style={styles.rangerActionCard}>
              <Text style={styles.sectionSubtitle}>⚡ Ranger Triage & Response Controls</Text>
              <Text style={styles.rangerActionHint}>
                Update status to notify the community member and dispatch field resources.
              </Text>

              {/* Status Action Buttons */}
              <Text style={styles.fieldLabel}>QUICK STATUS TRANSITION</Text>
              <View style={styles.statusBtnGroup}>
                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    targetStatus === ConflictStatus.UNDER_REVIEW && styles.statusBtnActiveReview,
                  ]}
                  onPress={() => setTargetStatus(ConflictStatus.UNDER_REVIEW)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      targetStatus === ConflictStatus.UNDER_REVIEW && styles.statusBtnTextActive,
                    ]}
                  >
                    1. Accept & Review
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    targetStatus === ConflictStatus.RESPONDING && styles.statusBtnActiveRespond,
                  ]}
                  onPress={() => setTargetStatus(ConflictStatus.RESPONDING)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      targetStatus === ConflictStatus.RESPONDING && styles.statusBtnTextActive,
                    ]}
                  >
                    2. Dispatch Unit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusBtn,
                    targetStatus === ConflictStatus.RESOLVED && styles.statusBtnActiveResolve,
                  ]}
                  onPress={() => setTargetStatus(ConflictStatus.RESOLVED)}
                >
                  <Text
                    style={[
                      styles.statusBtnText,
                      targetStatus === ConflictStatus.RESOLVED && styles.statusBtnTextActive,
                    ]}
                  >
                    3. Mark Resolved
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mitigation Action Presets */}
              <Text style={styles.fieldLabel}>RECOMMENDED MITIGATION ACTION</Text>
              <View style={styles.presetChipWrap}>
                {MITIGATION_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetChip,
                      mitigationAction === preset && styles.presetChipActive,
                    ]}
                    onPress={() => setMitigationAction(preset)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        mitigationAction === preset && styles.presetChipTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Mitigation Input */}
              <TextInput
                style={styles.textInput}
                value={mitigationAction}
                onChangeText={(val: string) => setMitigationAction(val)}
                placeholder="Custom mitigation or response action..."
                placeholderTextColor="#9CA3AF"
              />

              {/* Triage Notes */}
              <Text style={styles.fieldLabel}>TRIAGE NOTES FOR COMMUNITY & TEAM</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                value={triageNotes}
                onChangeText={(val: string) => setTriageNotes(val)}
                placeholder="Add notes: dispatched unit ETA, deterrents used, fence repairs..."
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={3}
              />

              {/* Submit Update Button */}
              <TouchableOpacity
                style={[styles.submitActionBtn, isUpdating && styles.submitActionBtnDisabled]}
                onPress={() => handleSaveStatusUpdate()}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitActionBtnText}>
                    Update Status to {targetStatus.replace(/_/g, ' ')}
                  </Text>
                )}
              </TouchableOpacity>
            </AppCard>
          )}

          <View style={{ height: 32 }} />
        </ScreenContainer>
      </View>
    );
  }

  // Render Reports List Screen
  return (
    <View style={styles.container}>
      <AppHeader
        title="Conflict Reports"
        subtitle={
          isRanger
            ? 'Community Triage & Field Response (UC04)'
            : isCommunityMember
            ? 'My Conflict Reports & Live Tracking'
            : 'HWC Records & Triage (UC04)'
        }
        showBackButton={!!onBack}
        onBack={onBack}
      />

      <ScreenContainer scrollable={true}>
        {/* Offline Queue Notice */}
        {pendingCount > 0 && (
          <AppCard variant="highlight" style={styles.queueCard}>
            <View style={styles.queueRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.queueText}>
                  ⚠️ {pendingCount} offline conflict report(s) queued on device.
                </Text>
                <Text style={{ fontSize: 11, color: '#A76D40', marginTop: 2, fontWeight: '600' }}>
                  Awaiting network transmission to central command.
                </Text>
              </View>
              {onSyncPress ? (
                <TouchableOpacity
                  style={styles.queueSyncBtn}
                  onPress={handleSync}
                  disabled={isSyncing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.queueSyncBtnText}>
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <StatusBadge status="PENDING SYNC" size="small" variant="warning" />
              )}
            </View>
          </AppCard>
        )}

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => setStatusFilter('ALL')}
            >
              <Text style={[styles.filterPillText, statusFilter === 'ALL' && styles.filterPillTextActive]}>
                All ({reports.length})
              </Text>
            </TouchableOpacity>

            {pendingCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  styles.filterPillOffline,
                  statusFilter === 'PENDING_SYNC' && styles.filterPillOfflineActive,
                ]}
                onPress={() => setStatusFilter('PENDING_SYNC')}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    styles.filterPillOfflineText,
                    statusFilter === 'PENDING_SYNC' && styles.filterPillOfflineTextActive,
                  ]}
                >
                  💾 Pending Sync ({pendingCount})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === ConflictStatus.SUBMITTED && styles.filterPillActive]}
              onPress={() => setStatusFilter(ConflictStatus.SUBMITTED)}
            >
              <Text style={[styles.filterPillText, statusFilter === ConflictStatus.SUBMITTED && styles.filterPillTextActive]}>
                Submitted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === ConflictStatus.UNDER_REVIEW && styles.filterPillActive]}
              onPress={() => setStatusFilter(ConflictStatus.UNDER_REVIEW)}
            >
              <Text style={[styles.filterPillText, statusFilter === ConflictStatus.UNDER_REVIEW && styles.filterPillTextActive]}>
                Under Review
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === ConflictStatus.RESPONDING && styles.filterPillActive]}
              onPress={() => setStatusFilter(ConflictStatus.RESPONDING)}
            >
              <Text style={[styles.filterPillText, statusFilter === ConflictStatus.RESPONDING && styles.filterPillTextActive]}>
                Responding
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === ConflictStatus.RESOLVED && styles.filterPillActive]}
              onPress={() => setStatusFilter(ConflictStatus.RESOLVED)}
            >
              <Text style={[styles.filterPillText, statusFilter === ConflictStatus.RESOLVED && styles.filterPillTextActive]}>
                Resolved
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {isCommunityMember && (
            <TouchableOpacity
              style={[styles.myReportsToggle, filterMyReportsOnly && styles.myReportsToggleActive]}
              onPress={() => setFilterMyReportsOnly(!filterMyReportsOnly)}
            >
              <Text style={[styles.myReportsToggleText, filterMyReportsOnly && styles.myReportsToggleTextActive]}>
                {filterMyReportsOnly ? '⭐ Showing My Reports Only' : '👤 Filter My Reports'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.sectionHeading}>Logged Incidents ({displayedReports.length})</Text>
          {onNewReportPress && (
            <TouchableOpacity
              style={styles.newBtn}
              onPress={onNewReportPress}
              activeOpacity={0.8}
            >
              <Text style={styles.newBtnText}>+ New Report</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color="#3E8E41" />
            <Text style={styles.loaderText}>Fetching conflict reports...</Text>
          </View>
        ) : displayedReports.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Conflicts Recorded</Text>
            <Text style={styles.emptyDesc}>
              {statusFilter === 'PENDING_SYNC'
                ? 'No pending offline reports. All mutations are synchronized with the server.'
                : statusFilter !== 'ALL'
                ? `No reports found matching status "${statusFilter}".`
                : 'No human-wildlife encounters logged in this sector yet.'}
            </Text>
          </AppCard>
        ) : (
          displayedReports.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleOpenDetail(item)}
              activeOpacity={0.85}
            >
              <AppCard
                style={[
                  styles.reportCard,
                  item.isPendingSync && styles.reportCardOffline,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>
                      {item.conflictType.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  {item.isPendingSync ? (
                    <StatusBadge status="PENDING SYNC" size="small" variant="warning" />
                  ) : (
                    <StatusBadge status={item.status} size="small" />
                  )}
                </View>

                {item.isPendingSync ? (
                  <View style={styles.offlineItemTag}>
                    <Text style={styles.offlineItemTagText}>
                      💾 Stored in local offline queue • Tap to review
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.reportDesc} numberOfLines={3}>
                  {item.description}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    📍 {Number(item.latitude).toFixed(3)}, {Number(item.longitude).toFixed(3)}
                  </Text>
                  <Text style={styles.metaText}>
                    👤 {item.reporterName || 'Villager'} ({item.villageName || 'Buffer'})
                  </Text>
                </View>

                {item.mitigationAction ? (
                  <View style={styles.actionSnippetRow}>
                    <Text style={styles.actionSnippetText}>
                      🛡️ Action: {item.mitigationAction}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.tapPromptRow}>
                  <Text style={styles.tapPromptText}>
                    {isRanger
                      ? '👉 Tap to triage & take ranger action ›'
                      : '👉 Tap to view live status & ranger response ›'}
                  </Text>
                </View>
              </AppCard>
            </TouchableOpacity>
          ))
        )}
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  queueCard: {
    marginBottom: 12,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A76D40',
    flex: 1,
    marginRight: 8,
  },
  filterBar: {
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#3E8E41',
    borderColor: '#3E8E41',
  },
  filterPillOffline: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  filterPillOfflineActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5C4033',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterPillOfflineText: {
    color: '#92400E',
    fontWeight: '700',
  },
  filterPillOfflineTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  queueSyncBtn: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  queueSyncBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  detailOfflineBanner: {
    marginBottom: 12,
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFBEB',
  },
  detailOfflineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailOfflineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  detailOfflineDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  reportCardOffline: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    backgroundColor: '#FFFDF5',
  },
  offlineItemTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  offlineItemTagText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '700',
  },
  myReportsToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A76D40',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF7EE',
  },
  myReportsToggleActive: {
    backgroundColor: '#A76D40',
  },
  myReportsToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A76D40',
  },
  myReportsToggleTextActive: {
    color: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  newBtn: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  loaderWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loaderText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  reportCard: {
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#FAF7EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A76D40',
  },
  reportDesc: {
    fontSize: 12,
    color: '#1C2A1E',
    lineHeight: 17,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  actionSnippetRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionSnippetText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3E8E41',
  },
  tapPromptRow: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  tapPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A76D40',
  },
  // Stepper Styles
  stepperCard: {
    marginBottom: 14,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepperTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C2A1E',
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#3E8E41',
    transform: [{ scale: 1.1 }],
  },
  stepCirclePassed: {
    backgroundColor: '#1C2A1E',
  },
  stepIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepIconTextHighlight: {
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#3E8E41',
    fontWeight: '800',
  },
  stepLabelPassed: {
    color: '#1C2A1E',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
    marginTop: -16,
  },
  stepConnectorPassed: {
    backgroundColor: '#3E8E41',
  },
  statusExplainerBox: {
    marginTop: 14,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  statusExplainerText: {
    fontSize: 12,
    color: '#5C4033',
    lineHeight: 16,
  },
  // Detail Card
  detailCard: {
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  detailGridRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailGridCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C2A1E',
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3E8E41',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  detailDescText: {
    fontSize: 13,
    color: '#1C2A1E',
    lineHeight: 18,
    marginTop: 4,
  },
  damageBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  damageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  damageItem: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  boldSpan: {
    fontWeight: '700',
  },
  // Community View
  communityActionCard: {
    marginBottom: 14,
  },
  actionDetailItem: {
    marginBottom: 10,
  },
  notesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  safetyNoticeBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  safetyNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 15,
  },
  // Ranger View
  rangerActionCard: {
    marginBottom: 14,
  },
  rangerActionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A76D40',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  statusBtnGroup: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
    alignItems: 'center',
  },
  statusBtnActiveReview: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  statusBtnActiveRespond: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  statusBtnActiveResolve: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5C4033',
    textAlign: 'center',
  },
  statusBtnTextActive: {
    color: '#1C2A1E',
  },
  presetChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FAF7EE',
    borderWidth: 1,
    borderColor: '#D1B370',
  },
  presetChipActive: {
    backgroundColor: '#3E8E41',
    borderColor: '#3E8E41',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5C4033',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1C2A1E',
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  submitActionBtn: {
    backgroundColor: '#3E8E41',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitActionBtnDisabled: {
    opacity: 0.6,
  },
  submitActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
