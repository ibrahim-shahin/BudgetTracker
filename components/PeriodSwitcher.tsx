import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { type PeriodKey, formatPeriodLabel, shiftPeriod } from '@/utils/dates';
import { tapFeedback } from '@/utils/haptics';

interface Props {
  period: PeriodKey;
  current: PeriodKey;
  startDay: number;
  onChange: (period: PeriodKey) => void;
}

/** "‹ November 2026 ›", with a way back to the current month. */
export default function PeriodSwitcher({ period, current, startDay, onChange }: Props) {
  const colors = useColors();
  const go = (next: PeriodKey) => {
    tapFeedback();
    onChange(next);
  };
  return (
    <View style={styles.row}>
      <Pressable
        testID="period-previous"
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={8}
        onPress={() => go(shiftPeriod(period, -1))}
        style={[styles.arrow, { backgroundColor: colors.muted }]}
      >
        <Feather name="chevron-left" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable
        testID="period-label"
        accessibilityRole="button"
        accessibilityHint={period === current ? undefined : 'Goes back to this month'}
        onPress={() => go(current)}
        style={styles.labelWrap}
      >
        <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
          {formatPeriodLabel(period, startDay)}
        </Text>
        {period !== current ? (
          <Text style={[styles.back, { color: colors.primary }]}>Back to this month</Text>
        ) : null}
      </Pressable>
      <Pressable
        testID="period-next"
        accessibilityRole="button"
        accessibilityLabel="Next month"
        hitSlop={8}
        onPress={() => go(shiftPeriod(period, 1))}
        style={[styles.arrow, { backgroundColor: colors.muted }]}
      >
        <Feather name="chevron-right" size={18} color={colors.foreground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  labelWrap: { flex: 1, alignItems: 'center' },
  label: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  back: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
});
