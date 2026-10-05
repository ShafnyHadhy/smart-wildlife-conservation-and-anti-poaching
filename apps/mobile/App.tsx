import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, StatusBar, Alert } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { offlineQueue } from './src/services/offlineQueue';
import { mobileSyncService } from './src/services/syncService';

export default function App() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const refreshQueueCount = useCallback(async () => {
    try {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    } catch (err) {
      console.warn('[App] Could not refresh offline queue count:', err);
    }
  }, []);

  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Device is currently offline. Switch to Online mode to synchronize pending operations.'
      );
      return;
    }

    try {
      const result = await mobileSyncService.syncPending(true);
      await refreshQueueCount();

      if (result.synced > 0) {
        Alert.alert(
          'Sync Succeeded',
          `Successfully synchronized ${result.synced} operation(s) to Neon PostgreSQL.`
        );
      } else if (result.failed > 0) {
        Alert.alert(
          'Sync Incomplete',
          `${result.failed} operation(s) could not be synchronized. Check queue details.`
        );
      } else {
        Alert.alert('Queue Empty', 'All operations are already up to date.');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Failed to complete synchronization.');
    }
  };

  const handleToggleOnline = async () => {
    const nextOnline = !isOnline;
    setIsOnline(nextOnline);

    if (nextOnline) {
      const currentPending = await offlineQueue.getPendingCount();
      if (currentPending > 0) {
        const result = await mobileSyncService.syncPending(true);
        await refreshQueueCount();
        if (result.synced > 0) {
          Alert.alert(
            'Online Reconnected',
            `Back online! Synchronized ${result.synced} pending field report(s).`
          );
        }
      }
    } else {
      Alert.alert(
        'Offline Mode Active',
        'Device disconnected. Reports and field responses will be safely cached locally.'
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />
      <AppNavigator
        isOnline={isOnline}
        pendingCount={pendingCount}
        onToggleOnline={handleToggleOnline}
        onSyncNow={handleSyncNow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b1120',
  },
});
