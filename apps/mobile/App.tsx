import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';

export default function App() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);

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
          onPress={() => setIsOnline(!isOnline)}
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
            <View style={styles.queuePill}>
              <Text style={styles.queuePillText}>0 PENDING</Text>
            </View>
          </View>
          <Text style={styles.syncCardDesc}>
            {isOnline
              ? 'Connected to central command. Field submissions sync directly to Neon PostgreSQL.'
              : 'Network unavailable in sanctuary zone. Field reports will be cached locally and synced on return.'}
          </Text>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => setIsOnline(!isOnline)}
          >
            <Text style={styles.syncButtonText}>
              Toggle Simulated Connectivity ({isOnline ? 'Simulate Offline' : 'Simulate Online'})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Operational Field Workflows */}
        <Text style={styles.sectionTitle}>Field Operations (Phase 1 Shell)</Text>

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
            <Text style={styles.offlineTag}>OFFLINE CAPABLE</Text>
          </View>
          <Text style={styles.workflowTitle}>Report Poaching / Wildlife Incident</Text>
          <Text style={styles.workflowDesc}>
            Capture GPS coordinates, select incident category (snares, carcasses, intrusion), and attach photo proof.
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
            <Text style={styles.offlineTag}>OFFLINE CAPABLE</Text>
          </View>
          <Text style={styles.workflowTitle}>Respond to Wildlife Risk Alert</Text>
          <Text style={styles.workflowDesc}>
            Receive animal GPS collar intrusion alerts near buffer zones and record operational responses.
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
            <Text style={styles.offlineTag}>OFFLINE CAPABLE</Text>
          </View>
          <Text style={styles.workflowTitle}>Report Human-Wildlife Conflict</Text>
          <Text style={styles.workflowDesc}>
            Community reporting for crop damage, elephant encounters, and village boundary threats.
          </Text>
        </TouchableOpacity>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Smart Wildlife Conservation System • University CSSE Project
          </Text>
          <Text style={styles.footerSubtext}>
            Base Shell Ready • Built with React Native & Expo
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
  queuePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  syncCardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 12,
  },
  syncButton: {
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
    backgroundColor: '#111d33',
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workflowTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  offlineTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#64748b',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
});
