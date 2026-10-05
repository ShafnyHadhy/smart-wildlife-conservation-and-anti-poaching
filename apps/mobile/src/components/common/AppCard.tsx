import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';

interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outline' | 'highlight';
}

export function AppCard({
  children,
  onPress,
  style,
  variant = 'default',
}: AppCardProps) {
  const cardStyle = [
    styles.card,
    variant === 'elevated' && styles.elevated,
    variant === 'outline' && styles.outline,
    variant === 'highlight' && styles.highlight,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1B370',
    marginBottom: 12,
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  elevated: {
    backgroundColor: '#FAF7EE',
    borderColor: '#D1B370',
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#D1B370',
  },
  highlight: {
    backgroundColor: '#FAF7EE',
    borderColor: '#3E8E41',
  },
});
