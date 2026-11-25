import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import { FREQUENCY_LABELS } from '@/types';
import { formatDayLabel, today } from '@/utils/dates';
import { formatMoney } from '@/utils/money';
import { nextDueDate } from '@/utils/recurring';

export default function RecurringScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const recurring = useBudgetStore(s => s.recurring);
  const categories = useBudgetStore(s => s.categories);
  const currency = useBudgetStore(s => s.currency);
  const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const now = today();
  const sorted = useMemo(
    () => [...recurring].sort((a, b) => (nextDueDate(a, now) ?? '9999').localeCompare(nextDueDate(b, now) ?? '9999')),
    [recurring, now],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Recurring expenses</Text>
        <TouchableOpacity
          testID="add-recurring"
          accessibilityRole="button"
          accessibilityLabel="New recurring expense"
          hitSlop={10}
          disabled={categories.length === 0}
          onPress={() => router.push('/recurring-form')}
        >
          <Feather name="plus" size={22} color={categories.length === 0 ? colors.border : colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={r => r.id}
        renderItem={({ item }) => {
          const category = categoryById.get(item.categoryId);
          const next = nextDueDate(item, now);
          return (
            <TouchableOpacity
              testID={`recurring-${item.id}`}
              accessibilityRole="button"
              style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => router.push({ pathname: '/recurring-form', params: { id: item.id } })}
            >
              <View style={[styles.icon, { backgroundColor: (category?.color ?? colors.mutedForeground) + '22' }]}>
                <Feather name={item.paused ? 'pause' : 'repeat'} size={16} color={category?.color ?? colors.mutedForeground} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.merchant || category?.name || 'Expense'}
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {FREQUENCY_LABELS[item.frequency]} · {item.paused ? 'Paused' : next ? `Next ${formatDayLabel(next, now)}` : 'Done'}
                  {category && item.merchant ? ` · ${category.name}` : ''}
                </Text>
              </View>
              <Text style={[styles.amount, { color: item.paused ? colors.mutedForeground : colors.foreground }]}>{formatMoney(item.amount, currency)}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title="No recurring expenses"
            description="Rent, subscriptions and other regular payments are added for you on their dates. Choose a repeat when adding an expense, or tap +."
          />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  amount: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
