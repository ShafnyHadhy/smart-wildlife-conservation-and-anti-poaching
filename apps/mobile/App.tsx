import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { offlineQueue } from './src/offline/offlineQueue';
import { mobileSyncService } from './src/offline/syncService';
import { mobileApiClient } from './src/api/apiClient';
import { IncidentType } from '@wildlife/shared';

export default function App() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatusText, setSyncStatusText] = useState<string>('');

  const refreshQueueCount = async () => {
    const count = await offlineQueue.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    refreshQueueCount();
  }, []);

  const handleToggleOnline = async () => {
    const nextOnline = !isOnline;
    setIsOnline(nextOnline);

    if (nextOnline) {
      setSyncStatusText('Replaying offline queue to server...');
      const result = await mobileSyncService.syncPending(true);
      await refreshQueueCount();
      if (result.synced > 0) {
        setSyncStatusText(`Synced ${result.synced} operation(s) to Neon PostgreSQL successfully!`);
      } else if (result.failed > 0) {
        setSyncStatusText(`${result.failed} operation(s) failed during sync.`);
      } else {
        setSyncStatusText('Queue is empty. Device is online.');
      }
    } else {
      setSyncStatusText('Device offline. Field mutations will be saved to local queue.');
    }
  };

  const handleQueueTestMutation = async () => {
    const res = await mobileApiClient.reportIncident(
      {
        rangerId: '11111111-1111-1111-1111-111111111102', // Seed Ranger Saman
        incidentType: IncidentType.SNARE,
        description: 'Simulated field wire snare detected during offline patrol',
        latitude: 6.365,
        longitude: 80.46,
      },
      isOnline
    );

    await refreshQueueCount();
    if (res.direct) {
      Alert.alert('Online Submission', 'Incident submitted directly to Neon database.');
    } else {
      Alert.alert('Offline Queued', 'Incident saved to persistent offline queue. Toggle Online to sync.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Mobile Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBadge}>SRI LANKA WILDLIFE CONSERVATION</Text>
          <Text style={styles.headerTitle}>Ranger Field Terminal</Text>
        </View>

        {/* Connectivity / Sync Status Badge */}
        <TouchableOpacity
          style={[styles.statusBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}
          onPress={handleToggleOnline}
          activeOpacity={0.7}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offline-First Sync Banner */}
        <View style={styles.syncCard}>
          <View style={styles.syncCardHeader}>
            <Text style={styles.syncCardTitle}>Offline Sync Queue</Text>
            <View style={[styles.queuePill, pendingCount > 0 && styles.queuePillActive]}>
              <Text style={[styles.queuePillText, pendingCount > 0 && styles.queuePillTextActive]}>
                {pendingCount} PENDING
              </Text>
            </View>
          </View>
          <Text style={styles.syncCardDesc}>
            {isOnline
              ? 'Connected to central command. Field submissions sync directly to Neon PostgreSQL.'
              : 'Network unavailable in sanctuary zone. Field reports will be cached locally and synced on return.'}
          </Text>

          {syncStatusText ? (
            <Text style={styles.syncStatusLive}>{syncStatusText}</Text>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.syncButton} onPress={handleToggleOnline}>
              <Text style={styles.syncButtonText}>
                {isOnline ? 'Switch to Offline' : 'Sync Now (Switch Online)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={handleQueueTestMutation}>
              <Text style={styles.testButtonText}>
                {isOnline ? 'Submit Live Test' : '+ Queue Offline Test'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Operational Field Workflows */}
        <Text style={styles.sectionTitle}>Field Operations (Phase 3 Foundation Ready)</Text>

        {/* UC02 Card */}
        <TouchableOpacity
          style={[
            styles.workflowCard,
            activeWorkflow === 'UC02' && styles.workflowCardActive,
          ]}
          onPress={() => setActiveWorkflow('UC02')}
          activeOpacity={0.8}
        >
          <View style={styles.workflowHeader}>
            <Text style={styles.workflowTag}>UC02 • RANGER</Text>
            <Text style={styles.offlineTag}>OFFLINE READY</Text>
          </View>
          <Text style={styles.workflowTitle}>Report Poaching / Wildlife Incident</Text>
          <Text style={styles.workflowDesc}>
            Captures GPS coordinates, categorizes incident (snares, carcasses, intrusion), and queues locally when offline.
          </Text>
        </TouchableOpacity>

        {/* UC03 Card */}
        <TouchableOpacity
          style={[
            styles.workflowCard,
            activeWorkflow === 'UC03' && styles.workflowCardActive,
          ]}
          onPress={() => setActiveWorkflow('UC03')}
          activeOpacity={0.8}
        >
          <View style={styles.workflowHeader}>
            <Text style={styles.workflowTag}>UC03 • RESPONDER</Text>
            <Text style={styles.offlineTag}>OFFLINE READY</Text>
          </View>
          <Text style={styles.workflowTitle}>Respond to Wildlife Risk Alert</Text>
          <Text style={styles.workflowDesc}>
            Receive animal GPS collar intrusion alerts near buffer zones and record operational responses with offline replay.
          </Text>
        </TouchableOpacity>

        {/* UC04 Card */}
        <TouchableOpacity
          style={[
            styles.workflowCard,
            activeWorkflow === 'UC04' && styles.workflowCardActive,
          ]}
          onPress={() => setActiveWorkflow('UC04')}
          activeOpacity={0.8}
        >
          <View style={styles.workflowHeader}>
            <Text style={styles.workflowTag}>UC04 • COMMUNITY</Text>
            <Text style={styles.offlineTag}>OFFLINE READY</Text>
          </View>
          <Text style={styles.workflowTitle}>Report Human-Wildlife Conflict</Text>
          <Text style={styles.workflowDesc}>
            Community reporting for crop damage, elephant encounters, and village boundary threats with idempotent sync.
          </Text>
        </TouchableOpacity>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Smart Wildlife Conservation System • Phase 3 Shared Foundation
          </Text>
          <Text style={styles.footerSubtext}>
            Offline Queue & Idempotent Batch Sync Active
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
  },
  syncCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 24,
  },
  syncCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  queuePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  queuePillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  queuePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  queuePillTextActive: {
    color: '#fbbf24',
  },
  syncCardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 10,
  },
  syncStatusLive: {
    fontSize: 11,
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  testButton: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34d399',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  workflowCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 12,
  },
  workflowCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workflowTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    letterSpacing: 0.6,
  },
  offlineTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workflowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  workflowDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  footer: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
});
