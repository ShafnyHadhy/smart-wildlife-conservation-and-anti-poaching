import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { HiChevronLeft } from 'react-icons/hi2';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  rightAction,
}: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <HiChevronLeft size={16} color="#3E8E41" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAF7EE',
    borderBottomWidth: 1,
    borderBottomColor: '#D1B370',
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5DC',
    borderWidth: 1,
    borderColor: '#D1B370',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: '#3E8E41',
    fontSize: 13,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C2A1E',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A76D40',
    marginTop: 2,
  },
  rightAction: {
    marginLeft: 12,
  },
});
