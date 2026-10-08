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
  const normalized = status.toUpperCase().replace(/[_\s]+/g, '_');
  if (['ACTIVE', 'RESOLVED', 'COMPLETED', 'SYNCED', 'ONLINE'].includes(normalized)) {
    return 'success';
  }
  if (['HIGH', 'CRITICAL', 'FAILED', 'CANCELLED'].includes(normalized)) {
    return 'danger';
  }
  if (['PENDING', 'PENDING_SYNC', 'UNDER_REVIEW', 'RESPONDING', 'IN_PROGRESS', 'MEDIUM'].includes(normalized)) {
    return 'warning';
  }
  if (['SUBMITTED', 'SCHEDULED', 'PLANNED', 'LOW'].includes(normalized)) {
    return 'info';
  }
  if (['OFFLINE', 'OFFLINE_QUEUED'].includes(normalized)) {
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },

  // Variants using #3E8E41, #A76D40, #D1B370
  success: { backgroundColor: 'rgba(62, 142, 65, 0.15)', borderWidth: 1, borderColor: '#3E8E41' },
  successDot: { backgroundColor: '#3E8E41' },
  successText: { color: '#2E6B31' },

  warning: { backgroundColor: 'rgba(167, 109, 64, 0.15)', borderWidth: 1, borderColor: '#A76D40' },
  warningDot: { backgroundColor: '#A76D40' },
  warningText: { color: '#854F26' },

  danger: { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderWidth: 1, borderColor: '#DC2626' },
  dangerDot: { backgroundColor: '#DC2626' },
  dangerText: { color: '#991B1B' },

  info: { backgroundColor: 'rgba(209, 179, 112, 0.25)', borderWidth: 1, borderColor: '#D1B370' },
  infoDot: { backgroundColor: '#A76D40' },
  infoText: { color: '#735A22' },

  offline: { backgroundColor: 'rgba(167, 109, 64, 0.2)', borderWidth: 1, borderColor: '#A76D40' },
  offlineDot: { backgroundColor: '#A76D40' },
  offlineText: { color: '#854F26' },

  neutral: { backgroundColor: 'rgba(120, 113, 108, 0.15)', borderWidth: 1, borderColor: '#A8A29E' },
  neutralDot: { backgroundColor: '#78716C' },
  neutralText: { color: '#44403C' },
});
