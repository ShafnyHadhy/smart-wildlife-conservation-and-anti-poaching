import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'offline';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({
  status,
  variant,
  size = 'medium',
  style,
}: StatusBadgeProps) {
  const resolvedVariant: BadgeVariant = variant || getVariantFromStatus(status);

  return (
    <View
      style={[
        styles.badge,
        size === 'small' ? styles.smallBadge : styles.mediumBadge,
        styles[resolvedVariant],
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          size === 'small' ? styles.smallDot : styles.mediumDot,
          styles[`${resolvedVariant}Dot` as keyof typeof styles],
        ]}
      />
      <Text
        style={[
          styles.text,
          size === 'small' ? styles.smallText : styles.mediumText,
          styles[`${resolvedVariant}Text` as keyof typeof styles],
        ]}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

function getVariantFromStatus(status: string): BadgeVariant {
  const normalized = status.toUpperCase();
  if (['ACTIVE', 'RESOLVED', 'COMPLETED', 'SYNCED', 'ONLINE'].includes(normalized)) {
    return 'success';
  }
  if (['HIGH', 'CRITICAL', 'FAILED', 'CANCELLED'].includes(normalized)) {
    return 'danger';
  }
  if (['PENDING', 'UNDER_REVIEW', 'RESPONDING', 'IN_PROGRESS', 'MEDIUM'].includes(normalized)) {
    return 'warning';
  }
  if (['SUBMITTED', 'SCHEDULED', 'PLANNED', 'LOW'].includes(normalized)) {
    return 'info';
  }
  if (['OFFLINE'].includes(normalized)) {
    return 'offline';
  }
  return 'neutral';
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mediumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: 9999,
    marginRight: 6,
  },
  smallDot: {
    width: 6,
    height: 6,
  },
  mediumDot: {
    width: 8,
    height: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },

  // Variants
  success: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: '#22c55e' },
  successDot: { backgroundColor: '#22c55e' },
  successText: { color: '#4ade80' },

  warning: { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderWidth: 1, borderColor: '#eab308' },
  warningDot: { backgroundColor: '#eab308' },
  warningText: { color: '#facc15' },

  danger: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#ef4444' },
  dangerDot: { backgroundColor: '#ef4444' },
  dangerText: { color: '#f87171' },

  info: { backgroundColor: 'rgba(14, 165, 233, 0.15)', borderWidth: 1, borderColor: '#0ea5e9' },
  infoDot: { backgroundColor: '#0ea5e9' },
  infoText: { color: '#38bdf8' },

  offline: { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderWidth: 1, borderColor: '#f97316' },
  offlineDot: { backgroundColor: '#f97316' },
  offlineText: { color: '#fb923c' },

  neutral: { backgroundColor: 'rgba(148, 163, 184, 0.15)', borderWidth: 1, borderColor: '#64748b' },
  neutralDot: { backgroundColor: '#94a3b8' },
  neutralText: { color: '#cbd5e1' },
});
