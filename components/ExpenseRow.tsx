import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import type { Category, Expense } from '@/types';
import { formatDayLabel } from '@/utils/dates';
import { formatMoney } from '@/utils/money';

interface Props {
  expense: Expense;
  category?: Category;
  currency: string;
  showDate?: boolean;
  showCategory?: boolean;
  onPress: (expense: Expense) => void;
}

export default function ExpenseRow({ expense, category, currency, showDate = false, showCategory = true, onPress }: Props) {
  const colors = useColors();
  const title = expense.merchant || (showCategory ? category?.name : undefined) || 'Expense';
  const details = [
    showCategory && expense.merchant ? category?.name : undefined,
    showDate ? formatDayLabel(expense.date) : undefined,
    expense.notes || undefined,
    expense.tags.length > 0 ? expense.tags.map(t => `#${t}`).join(' ') : undefined,
  ].filter(Boolean);

  return (
    <Pressable
      testID={`expense-${expense.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(expense.amount, currency)}`}
      onPress={() => onPress(expense)}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: (category?.color ?? colors.mutedForeground) + '22' }]}>
        <Feather name={(category?.icon ?? 'tag') as 'tag'} size={16} color={category?.color ?? colors.mutedForeground} />
      </View>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {details.length > 0 ? (
          <Text style={[styles.details, { color: colors.mutedForeground }]} numberOfLines={1}>
            {details.join(' · ')}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, { color: colors.foreground }]}>{formatMoney(expense.amount, currency)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: 'Inter_500Medium', flexShrink: 1 },
  details: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amount: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
