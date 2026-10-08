import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { HiHome, HiOutlineDocumentText, HiOutlineBell, HiOutlineUser } from 'react-icons/hi2';

export type TabKey = 'HOME' | 'REPORTS' | 'ALERTS' | 'PROFILE' | 'MENU';

interface TabItem {
  key: TabKey;
  label: string;
  renderIcon: (color: string) => React.ReactNode;
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
    {
      key: 'HOME',
      label: 'Home',
      renderIcon: (color) => <HiHome size={22} color={color} />,
    },
    {
      key: 'REPORTS',
      label: 'Reports',
      badgeCount: reportsCount,
      renderIcon: (color) => <HiOutlineDocumentText size={22} color={color} />,
    },
    {
      key: 'ALERTS',
      label: 'Alerts',
      badgeCount: alertsCount,
      renderIcon: (color) => <HiOutlineBell size={22} color={color} />,
    },
    {
      key: 'PROFILE',
      label: 'Profile',
      renderIcon: (color) => <HiOutlineUser size={22} color={color} />,
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive =
          activeTab === tab.key ||
          (tab.key === 'PROFILE' && activeTab === 'MENU') ||
          (tab.key === 'HOME' && !['REPORTS', 'ALERTS', 'PROFILE', 'MENU'].includes(activeTab));

        const iconColor = isActive ? '#14532D' : '#4B5563';

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive && styles.activePillContainer]}
            onPress={() => onSelectTab(tab.key)}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrapper}>
              {tab.renderIcon(iconColor)}
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
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 4,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 64,
  },
  activePillContainer: {
    backgroundColor: '#DCFCE7', // soft pastel green pill from reference
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 16,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 26,
  },
  tabIcon: {
    fontSize: 20,
    color: '#374151',
  },
  activeTabIcon: {
    color: '#14532D',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  activeTabLabel: {
    color: '#14532D',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444', // vibrant red notification badge
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
});

