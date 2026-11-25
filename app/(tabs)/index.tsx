import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountCell from '@/components/AmountCell';
import CategoryCard from '@/components/CategoryCard';
import EmptyState from '@/components/EmptyState';
import PeriodSwitcher from '@/components/PeriodSwitcher';
import { useColors } from '@/hooks/useColors';
import { useBudgetMonth, useViewedPeriod } from '@/hooks/usePeriod';
import { useBudgetStore } from '@/store/budgetStore';
import type { FilterOption, SortOption } from '@/types';
import type { CategoryMonth } from '@/utils/budget';
import { confirm } from '@/utils/confirm';
import { pressFeedback, tapFeedback, warningFeedback } from '@/utils/haptics';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'spent', label: 'Most spent' },
  { key: 'remaining', label: 'Least left' },
  { key: 'budget', label: 'Budget' },
  { key: 'activity', label: 'Recent' },
];

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overspent', label: 'Over budget' },
  { key: 'under_budget', label: 'Within budget' },
  { key: 'no_expenses', label: 'No expenses' },
];

function matchesFilter(row: CategoryMonth, filter: FilterOption): boolean {
  switch (filter) {
    case 'overspent':
      return row.budget > 0 && row.remaining < 0;
    case 'under_budget':
      return row.count > 0 && (row.budget === 0 || row.remaining >= 0);
    case 'no_expenses':
      return row.count === 0;
    default:
      return true;
  }
}

function compare(a: CategoryMonth, b: CategoryMonth, sort: SortOption): number {
  switch (sort) {
    case 'spent':
      return b.spent - a.spent;
    case 'remaining':
      return a.remaining - b.remaining;
    case 'budget':
      return b.budget - a.budget;
    case 'activity':
      return (b.lastDate ?? '').localeCompare(a.lastDate ?? '');
    default:
      return a.category.name.localeCompare(b.category.name);
  }
}

export default function BudgetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currency = useBudgetStore(s => s.currency);
  const togglePin = useBudgetStore(s => s.togglePin);
  const deleteCategory = useBudgetStore(s => s.deleteCategory);
  const { period, current, startDay, setPeriod } = useViewedPeriod();
  const { rows, totals } = useBudgetMonth(period);

  const [sort, setSort] = useState<SortOption>('name');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showSort, setShowSort] = useState(false);

  const visible = useMemo(() => {
    const list = rows.filter(row => matchesFilter(row, filter)).sort((a, b) => compare(a, b, sort));
    return [...list.filter(r => r.category.pinned), ...list.filter(r => !r.category.pinned)];
  }, [rows, filter, sort]);

  const hasCategories = rows.length > 0;
  const isOver = totals.remaining < 0;

  const addExpense = (categoryId?: string) => {
    pressFeedback();
    router.push({ pathname: '/expense-form', params: categoryId ? { categoryId } : {} });
  };

  const askDelete = async (row: CategoryMonth) => {
    const count = useBudgetStore.getState().expenses.filter(e => e.categoryId === row.category.id).length;
    const ok = await confirm(
      `Delete ${row.category.name}?`,
      count > 0
        ? `Its ${count} expense${count === 1 ? '' : 's'} will be deleted too. This can't be undone.`
        : "This can't be undone.",
      'Delete',
      true,
    );
    if (ok) {
      warningFeedback();
      deleteCategory(row.category.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.appTitle, { color: colors.foreground }]}>Budget</Text>
          <View style={styles.headerActions}>
            {hasCategories ? (
              <TouchableOpacity
                testID="sort-button"
                accessibilityRole="button"
                accessibilityLabel={`Sort: ${SORT_OPTIONS.find(o => o.key === sort)?.label}`}
                style={[styles.pill, { backgroundColor: colors.muted }]}
                onPress={() => {
                  tapFeedback();
                  setShowSort(!showSort);
                }}
              >
                <Feather name="sliders" size={14} color={colors.mutedForeground} />
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{SORT_OPTIONS.find(o => o.key === sort)?.label}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              testID="add-category"
              accessibilityRole="button"
              accessibilityLabel="New category"
              style={[styles.pill, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/category-form')}
            >
              <Feather name="plus" size={14} color={colors.accentForeground} />
              <Text style={[styles.pillText, { color: colors.accentForeground }]}>Category</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PeriodSwitcher period={period} current={current} startDay={startDay} onChange={setPeriod} />

        <View style={styles.summaryRow}>
          <AmountCell testID="summary-budget" label="Budget" minor={totals.budget} currency={currency} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <AmountCell testID="summary-spent" label="Spent" minor={totals.spent} currency={currency} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <AmountCell
            testID="summary-remaining"
            label={isOver ? 'Over by' : 'Left'}
            minor={totals.remaining}
            currency={currency}
            color={isOver ? colors.destructive : colors.success}
          />
        </View>

        {hasCategories ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                testID={`filter-${opt.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected: filter === opt.key }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === opt.key ? colors.primary : colors.muted,
                    borderColor: filter === opt.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  tapFeedback();
                  setFilter(opt.key);
                }}
              >
                <Text style={[styles.filterChipText, { color: filter === opt.key ? colors.primaryForeground : colors.mutedForeground }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 12 }} />
        )}
      </View>

      {showSort ? (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSort(false)} />
          <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border, top: insets.top + 56 }]}>
            <Text style={[styles.sortMenuTitle, { color: colors.mutedForeground }]}>SORT BY</Text>
            {SORT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                testID={`sort-${opt.key}`}
                style={[styles.sortMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  tapFeedback();
                  setSort(opt.key);
                  setShowSort(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>{opt.label}</Text>
                {sort === opt.key ? <Feather name="check" size={16} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={row => row.category.id}
        renderItem={({ item }) => (
          <CategoryCard
            row={item}
            currency={currency}
            onOpen={() => router.push({ pathname: '/category/[id]', params: { id: item.category.id } })}
            onAddExpense={() => addExpense(item.category.id)}
            onEdit={() => router.push({ pathname: '/category-form', params: { id: item.category.id } })}
            onTogglePin={() => togglePin(item.category.id)}
            onDelete={() => void askDelete(item)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: 96 }]}
        ListEmptyComponent={
          hasCategories ? (
            <EmptyState icon="filter" title="Nothing here" description="No category matches this filter." />
          ) : (
            <EmptyState
              icon="credit-card"
              title="No categories yet"
              description="Make a category for each kind of spending, like groceries or fuel, and give it a monthly budget."
              actionLabel="Create a category"
              onAction={() => router.push('/category-form')}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {hasCategories ? (
        <TouchableOpacity
          testID="add-expense"
          accessibilityRole="button"
          accessibilityLabel="Add an expense"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => addExpense()}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={styles.fabText}>Expense</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryDivider: { width: 1, height: 32 },
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 12, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  listContent: { paddingTop: 12, flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sortMenu: {
    position: 'absolute',
    right: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 180,
    paddingTop: 8,
    overflow: 'hidden',
  },
  sortMenuTitle: { fontSize: 10, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, paddingHorizontal: 16, paddingBottom: 8 },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortMenuItemText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
