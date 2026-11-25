import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useColors } from '@/hooks/useColors';

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        // Not absolutely positioned: screens end above the tab bar, so their
        // buttons are never hidden behind it.
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          // The web preview has no safe-area padding, which clips the labels.
          ...(Platform.OS === 'web' ? { height: 64, paddingBottom: 8 } : {}),
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Budget', tabBarIcon: ({ color }) => <Feather name="credit-card" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Insights', tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} /> }}
      />
    </Tabs>
  );
}
