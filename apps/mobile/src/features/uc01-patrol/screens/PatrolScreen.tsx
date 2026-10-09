import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AuthUser } from '../../../services/authService';
import { Patrol } from '../types';
import { PatrolListScreen } from './PatrolListScreen';
import { ActivePatrolScreen } from './ActivePatrolScreen';

interface PatrolScreenProps {
  user?: AuthUser;
  isOnline?: boolean;
  onGoHome?: () => void;
  initialPatrol?: Patrol | null;
}

export function PatrolScreen({
  user,
  isOnline = true,
  onGoHome,
  initialPatrol = null,
}: PatrolScreenProps) {
  const [selectedPatrol, setSelectedPatrol] = useState<Patrol | null>(initialPatrol);

  if (selectedPatrol) {
    return (
      <View style={styles.container}>
        <ActivePatrolScreen
          patrol={selectedPatrol}
          user={user}
          isOnline={isOnline}
          onBack={() => setSelectedPatrol(null)}
          onPatrolUpdated={(updated) => setSelectedPatrol(updated)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PatrolListScreen
        user={user}
        isOnline={isOnline}
        onSelectPatrol={(patrol) => setSelectedPatrol(patrol)}
        onGoHome={onGoHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
});
