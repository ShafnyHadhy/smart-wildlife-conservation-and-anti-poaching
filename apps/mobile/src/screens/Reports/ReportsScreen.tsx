import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { AppHeader } from '../../components/common/AppHeader';
import { AppCard } from '../../components/common/AppCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CreateIncidentScreen } from '../../features/uc02-incidents/screens';

interface ReportsScreenProps {
  isOnline: boolean;
  pendingCount?: number;
  onSyncPress?: () => void;
  onIncidentSubmitted?: () => void;
  onGoHome: () => void;
}

export function ReportsScreen({
  isOnline,
  pendingCount = 0,
  onSyncPress,
  onIncidentSubmitted,
  onGoHome,
}: ReportsScreenProps) {
  const [activeView, setActiveView] = useState<
    'LIST' | 'CREATE_INCIDENT'
  >('LIST');

  const handleFeatureNavigate = (
    title: string,
    featureCode: string,
    description: string
  ) => {
    Alert.alert(
      `${title} (${featureCode})`,
      `${description}\n\nDedicated screen implementation belongs to ${featureCode}.`
    );
  };

  // Open UC02 Incident Form
  if (activeView === 'CREATE_INCIDENT') {
    return (
      <CreateIncidentScreen
        isOnline={isOnline}
        onBack={() => setActiveView('LIST')}
        onSubmitted={onIncidentSubmitted}
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <View style={styles.outerContainer}>
      <AppHeader
        title="Field Reports"
        subtitle="Incident & Conflict Submissions"
      />

      <ScreenContainer scrollable={true}>
        {/* Offline Queue Quick Banner */}
        {pendingCount > 0 ? (
          <AppCard variant="highlight" style={styles.queueCard}>
            <View style={styles.queueCardRow}>
              <View style={styles.queueTextColumn}>
                <Text style={styles.queueTitle}>
                  Pending Offline Queue
                </Text>

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
                  <Text style={styles.queueSyncBtnText}>
                    Sync
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        <Text style={styles.sectionHeading}>
          New Submissions
        </Text>

        {/* UC02 Option */}
        <AppCard
          variant="elevated"
          onPress={() => setActiveView('CREATE_INCIDENT')}
        >
          <View style={styles.reportRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FCA5A5',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={styles.reportIcon}>🚨</Text>
            </View>

            <View style={styles.reportTextColumn}>
              <View style={styles.tagRow}>
                <Text style={styles.reportCategory}>
                  UC02 • RANGER
                </Text>

                <StatusBadge
                  status="OFFLINE READY"
                  size="small"
                  variant="info"
                />
              </View>

              <Text style={styles.reportTitle}>
                Wildlife / Poaching Incident
              </Text>

              <Text style={styles.reportDesc}>
                Log snares, carcasses, campsites, or suspect
                tracks with GPS & photos.
              </Text>
            </View>
          </View>
        </AppCard>

        {/* UC04 Option */}
        <AppCard
          variant="elevated"
          onPress={() =>
            handleFeatureNavigate(
              'Report Conflict',
              'UC04',
              'Log agricultural crop damage, elephant village incursions, or property destruction.'
            )
          }
        >
          <View style={styles.reportRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: '#FFFBEB',
                  borderColor: '#D1B370',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={styles.reportIcon}>🌾</Text>
            </View>

            <View style={styles.reportTextColumn}>
              <View style={styles.tagRow}>
                <Text style={styles.reportCategory}>
                  UC04 • COMMUNITY
                </Text>

                <StatusBadge
                  status="OFFLINE READY"
                  size="small"
                  variant="info"
                />
              </View>

              <Text style={styles.reportTitle}>
                Human-Wildlife Conflict
              </Text>

              <Text style={styles.reportDesc}>
                Report elephant crop raids, fence breaches,
                or cattle attacks.
              </Text>
            </View>
          </View>
        </AppCard>

        <Text style={styles.sectionHeading}>
          History & Status
        </Text>

        {/* Submitted Reports */}
        <AppCard
          onPress={() =>
            handleFeatureNavigate(
              'Submitted Reports',
              'Shared',
              'View synced historical reports stored in Neon PostgreSQL.'
            )
          }
        >
          <View style={styles.simpleRow}>
            <Text style={styles.simpleRowIcon}>📂</Text>

            <View style={styles.simpleRowText}>
              <Text style={styles.simpleRowTitle}>
                My Submitted Reports
              </Text>

              <Text style={styles.simpleRowDesc}>
                View status of synced incidents and triage
                updates.
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </View>
        </AppCard>

        {/* Local Offline Reports Queue */}
        <AppCard
          onPress={() =>
            handleFeatureNavigate(
              'Offline Storage Queue',
              'Shared',
              'Inspect and retry unsynchronized operations in local persistent storage.'
            )
          }
        >
          <View style={styles.simpleRow}>
            <Text style={styles.simpleRowIcon}>💾</Text>

            <View style={styles.simpleRowText}>
              <Text style={styles.simpleRowTitle}>
                Pending Offline Reports
              </Text>

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