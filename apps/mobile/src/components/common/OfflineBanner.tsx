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
    backgroundColor: '#FAF7EE',
    borderBottomWidth: 1,
    borderBottomColor: '#A76D40',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  syncingContainer: {
    backgroundColor: '#FAF7EE',
    borderBottomWidth: 1,
    borderBottomColor: '#3E8E41',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
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
    backgroundColor: '#A76D40',
    marginRight: 10,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3E8E41',
    marginRight: 8,
  },
  textColumn: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A76D40',
    letterSpacing: 0.5,
  },
  offlineSubtext: {
    fontSize: 11,
    color: '#6B4728',
    marginTop: 1,
    fontWeight: '600',
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E6B31',
  },
  actionButton: {
    backgroundColor: '#A76D40',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  syncButton: {
    backgroundColor: '#3E8E41',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
