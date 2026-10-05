import React from 'react';
import {
  StyleSheet,
  SafeAreaView,
  ScrollView,
  View,
  ViewStyle,
  StyleProp,
  StatusBar,
} from 'react-native';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5DC" />
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
