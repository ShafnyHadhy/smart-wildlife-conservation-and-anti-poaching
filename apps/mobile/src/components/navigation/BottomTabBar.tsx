import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export type TabKey = 'HOME' | 'ALERTS' | 'REPORTS' | 'PROFILE' | 'MENU';

interface TabItem {
  key: TabKey;
  label: string;
  icon: string;
  badgeCount?: number;
}

interface BottomTabBarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  alertsCount?: number;
  reportsCount?: number;
}

export function BottomTabBar({
  activeTab,
  onSelectTab,
  alertsCount = 0,
  reportsCount = 0,
}: BottomTabBarProps) {
  const tabs: TabItem[] = [
    { key: 'HOME', label: 'Home', icon: '⌂' },
    { key: 'ALERTS', label: 'Alerts', icon: '⚠', badgeCount: alertsCount },
    { key: 'REPORTS', label: 'Reports', icon: '📋', badgeCount: reportsCount },
    { key: 'PROFILE', label: 'Profile', icon: '👤' },
    { key: 'MENU', label: 'Menu', icon: '☰' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.activeTabButton]}
            onPress={() => onSelectTab(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                {tab.icon}
              </Text>
              {tab.badgeCount && tab.badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FAF7EE',
    borderTopWidth: 1,
    borderTopColor: '#D1B370',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
    elevation: 4,
    shadowColor: '#A76D40',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 6,
  },
  activeTabButton: {
    borderTopWidth: 3,
    borderTopColor: '#3E8E41',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 26,
  },
  tabIcon: {
    fontSize: 20,
    color: '#78716C',
  },
  activeTabIcon: {
    color: '#3E8E41',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  activeTabLabel: {
    color: '#3E8E41',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#A76D40',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});
