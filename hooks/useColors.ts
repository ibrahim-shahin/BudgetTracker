import { useColorScheme } from 'react-native';

import colors from '@/constants/colors';
import { useBudgetStore } from '@/store/budgetStore';

export function useColors() {
  const systemScheme = useColorScheme();
  const theme = useBudgetStore(s => s.theme);
  const isDark =
    theme === 'system' ? systemScheme === 'dark' : theme === 'dark';
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius, isDark };
}
