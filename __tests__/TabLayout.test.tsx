import { render } from '@testing-library/react-native';
import React from 'react';

import TabLayout from '@/app/(tabs)/_layout';

const mockTabs: { screenOptions?: { tabBarStyle?: Record<string, unknown> }; names: string[] } = { names: [] };

jest.mock('expo-router', () => {
  function Tabs({ screenOptions, children }: { screenOptions: object; children: React.ReactNode }) {
    mockTabs.screenOptions = screenOptions;
    return children;
  }
  function Screen({ name }: { name: string }) {
    mockTabs.names.push(name);
    return null;
  }
  Tabs.Screen = Screen;
  return { Tabs };
});

it('keeps the tab bar out of the way of screen content (regression: it covered the add button)', async () => {
  await render(<TabLayout />);
  // An absolutely positioned tab bar sat on top of each screen's bottom edge,
  // hiding the floating "add" button behind it.
  expect(mockTabs.screenOptions?.tabBarStyle?.position).toBeUndefined();
  expect(mockTabs.names).toEqual(['index', 'expenses', 'analytics', 'settings']);
});
