import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface IncidentSuccessScreenProps {
  isOnline: boolean;
  onOk: () => void;
}

export function IncidentSuccessScreen({
  isOnline,
  onOk,
}: IncidentSuccessScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>✓</Text>
      </View>

      <Text style={styles.title}>
        {isOnline ? 'Incident Submitted' : 'Incident Saved'}
      </Text>

      <Text style={styles.message}>
        {isOnline
          ? 'Your incident report has been submitted successfully.'
          : 'Your incident report has been saved locally and will sync when internet connection is available.'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={onOk}>
        <Text style={styles.buttonText}>OK</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#3E8E41',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1C2A1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#3E8E41',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});