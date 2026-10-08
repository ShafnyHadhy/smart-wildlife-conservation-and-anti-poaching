import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConflictReportFormScreen } from '../../features/uc04-conflicts/screens/ConflictReportFormScreen';
import { ConflictListScreen } from '../../features/uc04-conflicts/screens/ConflictListScreen';
import { AuthUser } from '../../services/authService';

interface ReportsScreenProps {
  pendingCount?: number;
  onSyncPress?: () => void;
  isOnline?: boolean;
  user?: AuthUser;
  initialView?: 'hub' | 'conflict_form' | 'conflict_list';
  onResetView?: () => void;
}

export function ReportsScreen({
  pendingCount = 0,
  onSyncPress,
  isOnline = true,
  user,
  initialView = 'hub',
  onResetView,
}: ReportsScreenProps) {
  const [activeView, setActiveView] = useState<'hub' | 'conflict_form' | 'conflict_list'>(initialView);
  const [listFilter, setListFilter] = useState<any>('ALL');

  React.useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  const handleBackToHub = () => {
    setActiveView('hub');
    setListFilter('ALL');
    onResetView?.();
  };

  if (activeView === 'conflict_form') {
    return (
      <ConflictReportFormScreen
        isOnline={isOnline}
        onBack={handleBackToHub}
        onSubmitSuccess={() => {
          setListFilter('ALL');
          setActiveView('conflict_list');
        }}
        user={user}
      />
    );
  }

  if (activeView === 'conflict_list') {
    return (
      <ConflictListScreen
        onBack={handleBackToHub}
        onNewReportPress={() => setActiveView('conflict_form')}
        onSyncPress={onSyncPress}
        user={user}
        initialFilter={listFilter}
      />
    );
  }

  const handleFeatureNavigate = (title: string, featureCode: string, description: string) => {
    Alert.alert(
      `${title} (${featureCode})`,
      `${description}\n\nDedicated screen implementation belongs to ${featureCode}.`
    );
  };

  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';
  const isRanger = user?.role === 'RANGER';

  return (
    <View style={styles.outerContainer}>
      <AppHeader
        title="Field Reports"
        subtitle={
          isCommunityMember
            ? 'Community Conflict Submissions & Tracking'
            : isRanger
            ? 'Ranger Operations & Conflict Triage'
            : 'Incident & Conflict Submissions'
        }
      />

      <ScreenContainer scrollable={true}>
        {/* Offline Queue Quick Banner */}
        {pendingCount > 0 ? (
          <AppCard variant="highlight" style={styles.queueCard}>
            <View style={styles.queueCardRow}>
              <View style={styles.queueTextColumn}>
                <Text style={styles.queueTitle}>Pending Offline Queue</Text>
                <Text style={styles.queueSubtitle}>
                  {pendingCount} mutation(s) stored locally on device.
                </Text>
              </View>
              {onSyncPress ? (
                <TouchableOpacity
                  style={styles.queueSyncBtn}
                  onPress={onSyncPress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.queueSyncBtnText}>Sync</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        {/* Ranger Operations & Triage Section (Front and Center for Rangers) */}
        {isRanger && (
          <>
            <Text style={styles.sectionHeading}>Field Operations & Triage</Text>
            <AppCard
              variant="highlight"
              onPress={() => setActiveView('conflict_list')}
            >
              <View style={styles.simpleRow}>
                <Text style={styles.simpleRowIcon}>🛡️</Text>
                <View style={styles.simpleRowText}>
                  <View style={styles.badgeHeadingRow}>
                    <Text style={styles.simpleRowTitle}>Community Conflict Triage</Text>
                    <StatusBadge status="UC04 TRIAGE" size="small" variant="warning" />
                  </View>
                  <Text style={styles.simpleRowDesc}>
                    Review incoming villager reports, accept alerts & dispatch response teams.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </AppCard>
          </>
        )}

        <Text style={styles.sectionHeading}>
          {isRanger ? 'Log New Observations' : 'New Submissions'}
        </Text>

        {/* UC02 Option (Shown for Rangers or default view) */}
        {!isCommunityMember && (
          <AppCard
            variant="elevated"
            onPress={() =>
              handleFeatureNavigate(
                'Report Incident',
                'UC02',
                'Record wire snares, animal carcasses, illegal logging, or armed poaching activity with GPS fixes.'
              )
            }
          >
            <View style={styles.reportRow}>
              <View style={[styles.iconBadge, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1 }]}>
                <Text style={styles.reportIcon}>🚨</Text>
              </View>
              <View style={styles.reportTextColumn}>
                <View style={styles.tagRow}>
                  <Text style={styles.reportCategory}>UC02 • RANGER</Text>
                  <StatusBadge status="OFFLINE READY" size="small" variant="info" />
                </View>
                <Text style={styles.reportTitle}>Wildlife / Poaching Incident</Text>
                <Text style={styles.reportDesc}>
                  Log snares, carcasses, campsites, or suspect tracks with GPS & photos.
                </Text>
              </View>
            </View>
          </AppCard>
        )}

        {/* UC04 Option (For Community Members, or field assist for Rangers) */}
        <AppCard
          variant="elevated"
          onPress={() => setActiveView('conflict_form')}
        >
          <View style={styles.reportRow}>
            <View style={[styles.iconBadge, { backgroundColor: '#FFFBEB', borderColor: '#D1B370', borderWidth: 1 }]}>
              <Text style={styles.reportIcon}>🌾</Text>
            </View>
            <View style={styles.reportTextColumn}>
              <View style={styles.tagRow}>
                <Text style={styles.reportCategory}>
                  {isRanger ? 'UC04 • FIELD ASSIST' : 'UC04 • COMMUNITY'}
                </Text>
                <StatusBadge status="OFFLINE READY" size="small" variant="info" />
              </View>
              <Text style={styles.reportTitle}>Human-Wildlife Conflict</Text>
              <Text style={styles.reportDesc}>
                {isRanger
                  ? 'Record elephant crop raids or fence breaches on behalf of local villagers.'
                  : 'Report elephant crop raids, fence breaches, or cattle attacks.'}
              </Text>
            </View>
          </View>
        </AppCard>

        <Text style={styles.sectionHeading}>
          {isRanger ? 'Ranger Records & Queue' : 'History & Status'}
        </Text>

        {/* Community Members: My Submitted Reports / Rangers: All Community Reports Queue */}
        {isCommunityMember ? (
          <AppCard
            onPress={() => {
              setListFilter('ALL');
              setActiveView('conflict_list');
            }}
          >
            <View style={styles.simpleRow}>
              <Text style={styles.simpleRowIcon}>📂</Text>
              <View style={styles.simpleRowText}>
                <Text style={styles.simpleRowTitle}>My Submitted Reports</Text>
                <Text style={styles.simpleRowDesc}>
                  Track live status, ranger dispatch, and updates for your conflict reports.
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </AppCard>
        ) : (
          <AppCard
            onPress={() => {
              setListFilter('ALL');
              setActiveView('conflict_list');
            }}
          >
            <View style={styles.simpleRow}>
              <Text style={styles.simpleRowIcon}>📋</Text>
              <View style={styles.simpleRowText}>
                <Text style={styles.simpleRowTitle}>All Community Conflict Reports</Text>
                <Text style={styles.simpleRowDesc}>
                  View all active and resolved reports logged by village community members.
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </AppCard>
        )}

        {/* Local Offline Reports Queue */}
        <AppCard
          onPress={() => {
            setListFilter('PENDING_SYNC');
            setActiveView('conflict_list');
          }}
        >
          <View style={styles.simpleRow}>
            <Text style={styles.simpleRowIcon}>💾</Text>
            <View style={styles.simpleRowText}>
              <Text style={styles.simpleRowTitle}>Pending Offline Reports</Text>
              <Text style={styles.simpleRowDesc}>
                {pendingCount > 0
                  ? `${pendingCount} item(s) awaiting server synchronization.`
                  : 'Local offline queue is currently empty.'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </AppCard>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  queueCard: {
    marginBottom: 16,
  },
  queueCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTextColumn: {
    flex: 1,
    marginRight: 12,
  },
  queueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A76D40',
  },
  queueSubtitle: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  queueSyncBtn: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  queueSyncBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A76D40',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 10,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportIcon: {
    fontSize: 22,
  },
  reportTextColumn: {
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reportCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A76D40',
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  reportDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simpleRowIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  simpleRowText: {
    flex: 1,
  },
  simpleRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C2A1E',
  },
  badgeHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  simpleRowDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#A76D40',
    marginLeft: 8,
  },
});
