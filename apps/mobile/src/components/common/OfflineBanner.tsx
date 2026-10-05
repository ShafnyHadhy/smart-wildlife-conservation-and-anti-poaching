import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount?: number;
  onSyncPress?: () => void;
  onToggleOnline?: () => void;
}

export function OfflineBanner({
  isOnline,
  pendingCount = 0,
  onSyncPress,
  onToggleOnline,
}: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) {
    return null;
  }

  if (!isOnline) {
    return (
      <View style={styles.offlineContainer}>
        <View style={styles.leftRow}>
          <View style={styles.offlineDot} />
          <View style={styles.textColumn}>
            <Text style={styles.offlineTitle}>OFFLINE MODE</Text>
            <Text style={styles.offlineSubtext}>
              {pendingCount > 0
                ? `${pendingCount} report(s) queued. Will sync when connection is restored.`
                : 'Reports will be synchronized when connection is restored.'}
            </Text>
          </View>
        </View>
        {onToggleOnline ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onToggleOnline}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>Go Online</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // Online with pending items
  return (
    <View style={styles.syncingContainer}>
      <View style={styles.leftRow}>
        <View style={styles.syncDot} />
        <Text style={styles.syncText}>
          {pendingCount} report(s) ready to sync
        </Text>
      </View>
      {onSyncPress ? (
        <TouchableOpacity
          style={styles.syncButton}
          onPress={onSyncPress}
          activeOpacity={0.8}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offlineContainer: {
    backgroundColor: '#7c2d12',
    borderBottomWidth: 1,
    borderBottomColor: '#c2410c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncingContainer: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f97316',
    marginRight: 10,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    marginRight: 8,
  },
  textColumn: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fed7aa',
    letterSpacing: 0.5,
  },
  offlineSubtext: {
    fontSize: 11,
    color: '#ffedd5',
    marginTop: 1,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  actionButton: {
    backgroundColor: '#c2410c',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  syncButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
