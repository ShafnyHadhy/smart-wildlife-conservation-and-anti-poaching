import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange'
  | 'primary'
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
        styles[resolvedVariant] || styles.neutral,
        style,
      ]}
    >
      <View
        style={[
          styles.dot,
          size === 'small' ? styles.smallDot : styles.mediumDot,
          styles[`${resolvedVariant}Dot` as keyof typeof styles] || styles.neutralDot,
        ]}
      />
      <Text
        style={[
          styles.text,
          size === 'small' ? styles.smallText : styles.mediumText,
          styles[`${resolvedVariant}Text` as keyof typeof styles] || styles.neutralText,
        ]}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

function getVariantFromStatus(status: string): BadgeVariant {
  const normalized = status.toUpperCase().replace(/[_\s-]+/g, '_');

  // 1. Success / Resolved / Completed / Active
  if (['ACTIVE', 'RESOLVED', 'CLOSED', 'COMPLETED', 'SYNCED', 'ONLINE', 'HEALTHY'].includes(normalized)) {
    return 'success';
  }
  // 2. Urgent / Danger / Critical
  if (['HIGH', 'CRITICAL', 'FAILED', 'CANCELLED', 'REJECTED'].includes(normalized)) {
    return 'danger';
  }
  // 3. Responding / Action In Progress / Dispatched
  if (['RESPONDING', 'IN_PROGRESS', 'DISPATCHED', 'ACTION_TAKEN'].includes(normalized)) {
    return 'purple';
  }
  // 4. In Review / Under Investigation / Medium
  if (['UNDER_REVIEW', 'INVESTIGATING', 'UNDER_INVESTIGATION', 'MEDIUM'].includes(normalized)) {
    return 'warning';
  }
  // 5. Submitted / New / Scheduled / Planned / Low (Awaiting triage/review)
  if (['SUBMITTED', 'NEW', 'REPORTED', 'SCHEDULED', 'PLANNED', 'LOW'].includes(normalized)) {
    return 'info';
  }
  // 6. Offline / Pending Sync
  if (['PENDING_SYNC', 'PENDING_SYNCING', 'OFFLINE', 'OFFLINE_QUEUED', 'PENDING'].includes(normalized)) {
    return 'orange';
  }
  // 7. Neutral / Paused / Acknowledged
  if (['ACKNOWLEDGED', 'PAUSED', 'DISMISSED', 'FALSE_ALARM'].includes(normalized)) {
    return 'neutral';
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
    paddingVertical: 3,
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
    width: 7,
    height: 7,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 11,
  },

  // 1. Success (Emerald Green)
  success: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  successDot: { backgroundColor: '#10B981' },
  successText: { color: '#065F46' },

  // 2. Warning / Under Review (Amber / Gold)
  warning: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  warningDot: { backgroundColor: '#F59E0B' },
  warningText: { color: '#B45309' },

  // 3. Danger / Urgent (Rose / Crimson)
  danger: { backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  dangerDot: { backgroundColor: '#F43F5E' },
  dangerText: { color: '#BE123C' },

  // 4. Info / Submitted / New (Sky Blue)
  info: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' },
  infoDot: { backgroundColor: '#0EA5E9' },
  infoText: { color: '#0369A1' },

  // 5. Purple / Responding / Dispatched
  purple: { backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#E9D5FF' },
  purpleDot: { backgroundColor: '#9333EA' },
  purpleText: { color: '#7E22CE' },

  // 6. Orange / Pending Sync / Offline
  orange: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  orangeDot: { backgroundColor: '#F97316' },
  orangeText: { color: '#C2410C' },

  // 7. Primary / Royal Blue
  primary: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  primaryDot: { backgroundColor: '#2563EB' },
  primaryText: { color: '#1D4ED8' },

  // 8. Offline
  offline: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  offlineDot: { backgroundColor: '#F97316' },
  offlineText: { color: '#C2410C' },

  // 9. Neutral (Slate Gray)
  neutral: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  neutralDot: { backgroundColor: '#94A3B8' },
  neutralText: { color: '#475569' },
});

