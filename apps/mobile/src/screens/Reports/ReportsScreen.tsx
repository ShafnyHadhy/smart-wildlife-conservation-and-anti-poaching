
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';

import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { CreateIncidentScreen } from '../../features/uc02-incidents/screens';
import { ConflictReportFormScreen } from '../../features/uc04-conflicts/screens/ConflictReportFormScreen';
import { ConflictListScreen } from '../../features/uc04-conflicts/screens/ConflictListScreen';
import { AuthUser } from '../../services/authService';

interface ReportsScreenProps {
  isOnline?: boolean;
  pendingCount?: number;
  onSyncPress?: () => void;
  onIncidentSubmitted?: () => void;
  onGoHome?: () => void;
  user?: AuthUser;
  initialView?: ReportsView;
  onResetView?: () => void;
}

type ReportsView =
  | 'hub'
  | 'create_incident'
  | 'conflict_form'
  | 'conflict_list';

export function ReportsScreen({
  isOnline = true,
  pendingCount = 0,
  onSyncPress,
  onIncidentSubmitted,
  onGoHome = () => {},
  user,
  initialView = 'hub',
  onResetView,
}: ReportsScreenProps) {
  const [activeView, setActiveView] = useState<ReportsView>(initialView);
  const [listFilter, setListFilter] = useState<any>('ALL');

  React.useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const handleBackToHub = () => {
    setActiveView('hub');
    setListFilter('ALL');
    onResetView?.();
  };

  // UC02: Existing ranger incident form
  if (activeView === 'create_incident') {
    return (
      <CreateIncidentScreen
        isOnline={isOnline}
        onBack={handleBackToHub}
        onSubmitted={onIncidentSubmitted}
        onGoHome={onGoHome}
      />
    );
  }

  // UC04: Existing conflict form
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

  // UC04: Existing conflict list
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

  const isCommunityMember = user?.role === 'COMMUNITY_MEMBER';
  const isRanger = user?.role === 'RANGER';

  return (
    <View style={styles.container}>
      <AppHeader
        title="Field Reports"
        subtitle={
          isCommunityMember
            ? 'Community reporting and tracking'
            : isRanger
              ? 'Ranger field operations'
              : 'Incident and conflict reporting'
        }
      />

      <ScreenContainer scrollable={true}>
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>WILDLIFE CONSERVATION</Text>

          <Text style={styles.pageTitle}>
            Reports & Records
          </Text>

          <Text style={styles.pageDescription}>
            Submit field observations, manage reports,
            and monitor reporting activity.
          </Text>
        </View>

        {/* Connectivity */}
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionIndicator,
              !isOnline && styles.connectionIndicatorOffline,
            ]}
          />
          <Text style={styles.connectionText}>
            {isOnline
              ? 'Connected to server'
              : 'Offline mode — reports can be saved locally'}
          </Text>
        </View>

        {/* Offline queue */}
        {pendingCount > 0 && (
          <View style={styles.queuePanel}>
            <View style={styles.queueInfo}>
              <Text style={styles.queueTitle}>
                Reports Awaiting Sync
              </Text>

              <Text style={styles.queueDescription}>
                {pendingCount} item(s) stored locally
                and waiting for synchronization.
              </Text>
            </View>

            {onSyncPress && (
              <TouchableOpacity
                style={styles.syncButton}
                onPress={onSyncPress}
                activeOpacity={0.8}
              >
                <Text style={styles.syncButtonText}>
                  Sync Now
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Ranger triage */}
        {isRanger && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              FIELD OPERATIONS
            </Text>

            <AppCard
              variant="highlight"
              onPress={() => setActiveView('conflict_list')}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardEyebrow}>
                    COMMUNITY RESPONSE
                  </Text>

                  <Text style={styles.cardTitle}>
                    Community Conflict Triage
                  </Text>

                  <Text style={styles.cardDescription}>
                    Review incoming villager reports,
                    accept alerts, and coordinate
                    field response teams.
                  </Text>

                  <Text style={styles.cardLink}>
                    View Conflict Reports
                  </Text>
                </View>
              </View>
            </AppCard>
          </View>
        )}

        {/* New reports */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isRanger ? 'CREATE FIELD REPORT' : 'NEW REPORT'}
          </Text>

          {!isCommunityMember && (
            <AppCard
              variant="elevated"
              onPress={() => setActiveView('create_incident')}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.cardEyebrow}>
                    RANGER INCIDENT REPORT
                  </Text>

                  <Text style={styles.cardTitle}>
                    Wildlife / Poaching Incident
                  </Text>

                  <Text style={styles.cardDescription}>
                    Document illegal snares, wildlife
                    injuries, carcasses, suspicious
                    activities, and field observations
                    with GPS coordinates and photos.
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardLink}>
                      Create Incident Report
                    </Text>

                    <Text style={styles.offlineLabel}>
                      Offline Ready
                    </Text>
                  </View>
                </View>
              </View>
            </AppCard>
          )}

          <AppCard
            variant="elevated"
            onPress={() => setActiveView('conflict_form')}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={styles.cardEyebrow}>
                  {isRanger
                    ? 'COMMUNITY FIELD ASSISTANCE'
                    : 'COMMUNITY REPORT'}
                </Text>

                <Text style={styles.cardTitle}>
                  Human-Wildlife Conflict
                </Text>

                <Text style={styles.cardDescription}>
                  {isRanger
                    ? 'Record elephant crop raids, fence breaches, and related incidents on behalf of local communities.'
                    : 'Report elephant sightings, crop damage, fence breaches, or livestock attacks.'}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardLink}>
                    Create Conflict Report
                  </Text>

                  <Text style={styles.offlineLabel}>
                    Offline Ready
                  </Text>
                </View>
              </View>
            </View>
          </AppCard>
        </View>

        {/* Records */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            REPORT HISTORY & STATUS
          </Text>

          <AppCard
            onPress={() => {
              setListFilter('ALL');
              setActiveView('conflict_list');
            }}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  {isCommunityMember
                    ? 'My Submitted Reports'
                    : 'Community Conflict Reports'}
                </Text>

                <Text style={styles.cardDescription}>
                  {isCommunityMember
                    ? 'Track report status, ranger responses, and updates on your submitted conflict reports.'
                    : 'View active and resolved conflict reports submitted by community members.'}
                </Text>

                <Text style={styles.cardLink}>
                  View Reports
                </Text>
              </View>
            </View>
          </AppCard>

          <AppCard
            onPress={() => {
              setListFilter('PENDING_SYNC');
              setActiveView('conflict_list');
            }}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>
                  Pending Offline Reports
                </Text>

                <Text style={styles.cardDescription}>
                  {pendingCount > 0
                    ? `${pendingCount} report(s) awaiting server synchronization.`
                    : 'Your local offline queue is currently empty.'}
                </Text>

                <Text style={styles.cardLink}>
                  View Offline Queue
                </Text>
              </View>
            </View>
          </AppCard>
        </View>

        <Text style={styles.footerText}>
          Wildlife Conservation Management System
        </Text>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F4',
  },

  intro: {
    paddingTop: 12,
    marginBottom: 20,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#63806B',
    letterSpacing: 1.8,
    marginBottom: 9,
  },

  pageTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#1F392B',
    letterSpacing: -0.5,
  },

  pageDescription: {
    fontSize: 13,
    color: '#718078',
    lineHeight: 21,
    marginTop: 8,
  },

  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: '#EDF4EB',
    borderWidth: 1,
    borderColor: '#DCE9D8',
    borderRadius: 11,
    marginBottom: 20,
  },

  connectionIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3D9364',
    marginRight: 9,
  },

  connectionIndicatorOffline: {
    backgroundColor: '#C68D43',
  },

  connectionText: {
    flex: 1,
    fontSize: 11,
    color: '#43664E',
    fontWeight: '600',
  },

  queuePanel: {
    backgroundColor: '#FFF9ED',
    borderColor: '#E9D8B2',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },

  queueInfo: {
    marginBottom: 10,
  },

  queueTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#79592C',
  },

  queueDescription: {
    fontSize: 12,
    color: '#87765B',
    lineHeight: 18,
    marginTop: 5,
  },

  syncButton: {
    backgroundColor: '#28563B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },

  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  section: {
    marginBottom: 23,
    gap: 12,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#738379',
    letterSpacing: 1.1,
    marginBottom: 1,
  },

  cardContent: {
    paddingVertical: 5,
    paddingHorizontal: 2,
  },

  cardText: {
    flex: 1,
  },

  cardEyebrow: {
    color: '#6C8E74',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#233E2D',
    marginBottom: 7,
  },

  cardDescription: {
    fontSize: 12,
    color: '#78847C',
    lineHeight: 19,
    marginBottom: 13,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },

  cardLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#286442',
  },

  offlineLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64836C',
    backgroundColor: '#EDF5EE',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#A0AAA1',
    marginTop: 5,
    marginBottom: 28,
  },
});
