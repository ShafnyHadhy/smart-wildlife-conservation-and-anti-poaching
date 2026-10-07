import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { AppHeader } from '../../../components/common/AppHeader';
import { AppCard } from '../../../components/common/AppCard';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { ConflictReport } from '../types';
import { mobileConflictService } from '../services/conflictService';

interface ConflictListScreenProps {
  onBack?: () => void;
  onNewReportPress?: () => void;
}

export function ConflictListScreen({ onBack, onNewReportPress }: ConflictListScreenProps) {
  const [reports, setReports] = useState<ConflictReport[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [remoteReports, pendingOps] = await Promise.all([
        mobileConflictService.getConflictReports(),
        mobileConflictService.getPendingOfflineConflicts(),
      ]);
      setReports(remoteReports);
      setPendingCount(pendingOps.length);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Conflict Reports"
        subtitle="HWC Records & Triage (UC04)"
        showBackButton={!!onBack}
        onBack={onBack}
      />

      <ScreenContainer scrollable={true}>
        {/* Offline Queue Notice */}
        {pendingCount > 0 && (
          <AppCard variant="highlight" style={styles.queueCard}>
            <View style={styles.queueRow}>
              <Text style={styles.queueText}>
                ⚠️ {pendingCount} offline conflict report(s) queued on device.
              </Text>
              <StatusBadge status="PENDING SYNC" size="small" variant="warning" />
            </View>
          </AppCard>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.sectionHeading}>Logged Incidents ({reports.length})</Text>
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
        ) : reports.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Conflicts Recorded</Text>
            <Text style={styles.emptyDesc}>
              No human-wildlife encounters logged in this sector yet.
            </Text>
          </AppCard>
        ) : (
          reports.map((item) => (
            <AppCard key={item.id} style={styles.reportCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>
                    {item.conflictType.replace(/_/g, ' ')}
                  </Text>
                </View>
                <StatusBadge status={item.status} size="small" />
              </View>

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
            </AppCard>
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
    marginBottom: 10,
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
});
