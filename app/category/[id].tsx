import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountCell from '@/components/AmountCell';
import EmptyState from '@/components/EmptyState';
import ExpenseRow from '@/components/ExpenseRow';
import PeriodSwitcher from '@/components/PeriodSwitcher';
import ProgressBar from '@/components/ProgressBar';
import { useColors } from '@/hooks/useColors';
import { useViewedPeriod } from '@/hooks/usePeriod';
import { useBudgetStore } from '@/store/budgetStore';
import { budgetFor, expensesInPeriod, sumAmounts } from '@/utils/budget';
import { periodProgress, today } from '@/utils/dates';
import { pressFeedback } from '@/utils/haptics';
import { percentOf } from '@/utils/money';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { period, current, startDay, setPeriod } = useViewedPeriod();

  const category = useBudgetStore(s => s.categories.find(c => c.id === id));
  const expenses = useBudgetStore(s => s.expenses);
  const currency = useBudgetStore(s => s.currency);

  // Select the stored arrays and derive from them: a selector that builds a
  // new array on every call makes the screen re-render forever.
  const monthExpenses = useMemo(
    () =>
      expensesInPeriod(
        expenses.filter(e => e.categoryId === id),
        period,
        startDay,
      ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [expenses, id, period, startDay],
  );

  if (!category) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="alert-circle" title="Category not found" description="It may have been deleted." />
      </View>
    );
  }

  const budget = budgetFor(category, period);
  const spent = sumAmounts(monthExpenses);
  const remaining = budget - spent;
  const hasBudget = budget > 0;
  const isOver = hasBudget && remaining < 0;
  const { days, elapsed } = periodProgress(period, startDay, today());

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>
          {category.name}
        </Text>
        <TouchableOpacity
          testID="edit-category"
          accessibilityRole="button"
          accessibilityLabel={`Edit ${category.name}`}
          hitSlop={10}
          onPress={() => router.push({ pathname: '/category-form', params: { id: category.id } })}
        >
          <Feather name="edit-2" size={19} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={monthExpenses}
        keyExtractor={e => e.id}
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            category={category}
            currency={currency}
            showDate
            showCategory={false}
            onPress={e => router.push({ pathname: '/expense-form', params: { id: e.id } })}
          />
        )}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <PeriodSwitcher period={period} current={current} startDay={startDay} onChange={setPeriod} />
            <View style={[styles.stats, { backgroundColor: colors.card, borderColor: isOver ? colors.destructive : colors.border }]}>
              <View style={styles.amountRow}>
                <AmountCell testID="category-spent" label="Spent" minor={spent} currency={currency} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <AmountCell testID="category-budget" label="Budget" minor={hasBudget ? budget : null} currency={currency} />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <AmountCell
                  testID="category-left"
                  label={isOver ? 'Over by' : 'Left'}
                  minor={hasBudget ? remaining : null}
                  currency={currency}
                  color={isOver ? colors.destructive : colors.success}
                />
              </View>
              {hasBudget ? (
                <View style={styles.progress}>
                  <ProgressBar progress={spent / budget} color={category.color} height={8} />
                  <Text style={[styles.progressText, { color: isOver ? colors.destructive : colors.mutedForeground }]}>
                    {percentOf(spent, budget)}% used · {elapsed} of {days} days
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.count, { color: colors.mutedForeground }]}>
                {monthExpenses.length} expense{monthExpenses.length === 1 ? '' : 's'} this month
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="inbox" title="No expenses this month" description="Tap + to add one." />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        testID="add-expense"
        accessibilityRole="button"
        accessibilityLabel={`Add an expense to ${category.name}`}
        style={[styles.fab, { backgroundColor: category.color, bottom: insets.bottom + 20 }]}
        onPress={() => {
          pressFeedback();
          router.push({ pathname: '/expense-form', params: { categoryId: category.id } });
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  navTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerBlock: { padding: 16, gap: 14 },
  stats: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 32 },
  progress: { gap: 6 },
  progressText: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  count: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
