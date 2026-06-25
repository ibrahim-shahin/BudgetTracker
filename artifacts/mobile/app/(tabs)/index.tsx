import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import CategoryCard from '@/components/CategoryCard';
import AddExpenseModal from '@/components/AddExpenseModal';
import AddCategoryModal from '@/components/AddCategoryModal';
import ResetModal from '@/components/ResetModal';
import EmptyState from '@/components/EmptyState';
import type { Category, SortOption, FilterOption } from '@/types';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'remaining', label: 'Remaining' },
  { key: 'spent', label: 'Most Spent' },
  { key: 'budget', label: 'Budget' },
  { key: 'activity', label: 'Recent' },
  { key: 'overspent', label: 'Overspent' },
];

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'overspent', label: 'Overspent' },
  { key: 'under_budget', label: 'Under Budget' },
  { key: 'no_expenses', label: 'No Expenses' },
];

export default function Dashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const categories = useBudgetStore(s => s.categories);
  const currency = useBudgetStore(s => s.currency);
  const getCategoryTotal = useBudgetStore(s => s.getCategoryTotal);
  const getLastExpenseDate = useBudgetStore(s => s.getLastExpenseDate);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('name');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [resetCategory, setResetCategory] = useState<Category | undefined>();
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | undefined>();
  const [showSort, setShowSort] = useState(false);

  const totalBudget = useMemo(() => categories.reduce((s, c) => s + c.budget, 0), [categories]);
  const totalSpent = useMemo(() => categories.reduce((s, c) => s + getCategoryTotal(c.id), 0), [categories, getCategoryTotal]);
  const totalRemaining = totalBudget - totalSpent;

  const filteredAndSorted = useMemo(() => {
    let list = [...categories];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }

    list = list.filter(c => {
      const spent = getCategoryTotal(c.id);
      const remaining = c.budget - spent;
      switch (filter) {
        case 'overspent': return remaining < 0;
        case 'under_budget': return remaining >= 0 && spent > 0;
        case 'no_expenses': return spent === 0;
        default: return true;
      }
    });

    list.sort((a, b) => {
      const spentA = getCategoryTotal(a.id);
      const spentB = getCategoryTotal(b.id);
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'remaining': return (a.budget - spentA) - (b.budget - spentB);
        case 'spent': return spentB - spentA;
        case 'budget': return b.budget - a.budget;
        case 'activity': {
          const dA = getLastExpenseDate(a.id) ?? a.createdAt;
          const dB = getLastExpenseDate(b.id) ?? b.createdAt;
          return new Date(dB).getTime() - new Date(dA).getTime();
        }
        case 'overspent': return (a.budget - spentA) - (b.budget - spentB);
        default: return 0;
      }
    });

    const pinned = list.filter(c => c.pinned);
    const unpinned = list.filter(c => !c.pinned);
    return [...pinned, ...unpinned];
  }, [categories, search, sort, filter, getCategoryTotal, getLastExpenseDate]);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.appTitle, { color: colors.foreground }]}>Budget</Text>
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: colors.muted }]}
            onPress={() => { Haptics.selectionAsync(); setShowSort(!showSort); }}
          >
            <Feather name="sliders" size={15} color={colors.mutedForeground} />
            <Text style={[styles.sortBtnText, { color: colors.mutedForeground }]}>
              {SORT_OPTIONS.find(o => o.key === sort)?.label}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryRow]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Budget</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {currency} {totalBudget.toFixed(0)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Spent</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {currency} {totalSpent.toFixed(0)}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Remaining</Text>
            <Text style={[styles.summaryValue, { color: totalRemaining < 0 ? colors.destructive : colors.success }]}>
              {totalRemaining < 0 ? '−' : ''}{currency} {Math.abs(totalRemaining).toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search categories..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === opt.key ? colors.primary : colors.muted,
                  borderColor: filter === opt.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { Haptics.selectionAsync(); setFilter(opt.key); }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: filter === opt.key ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showSort && (
        <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border, top: isWeb ? 67 : insets.top }]}>
          <Text style={[styles.sortMenuTitle, { color: colors.mutedForeground }]}>SORT BY</Text>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, { borderBottomColor: colors.border }]}
              onPress={() => { Haptics.selectionAsync(); setSort(opt.key); setShowSort(false); }}
            >
              <Text style={[styles.sortMenuItemText, { color: colors.foreground }]}>{opt.label}</Text>
              {sort === opt.key && <Feather name="check" size={16} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filteredAndSorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CategoryCard
            category={item}
            onAddExpense={cat => {
              setSelectedExpenseCategory(cat.id);
              setShowAddExpense(true);
            }}
            onEdit={cat => {
              setEditingCategory(cat);
              setShowAddCategory(true);
            }}
            onReset={cat => {
              setResetCategory(cat);
              setShowResetModal(true);
            }}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 100 },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="credit-card"
            title={search ? 'No results' : 'No categories yet'}
            description={
              search
                ? 'Try a different search'
                : 'Create a budget category to start tracking your spending'
            }
            actionLabel={search ? undefined : 'Create Category'}
            onAction={search ? undefined : () => setShowAddCategory(true)}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 20 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddCategory(true); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => { setShowAddExpense(false); setSelectedExpenseCategory(undefined); }}
        initialCategoryId={selectedExpenseCategory}
      />
      <AddCategoryModal
        visible={showAddCategory}
        onClose={() => { setShowAddCategory(false); setEditingCategory(undefined); }}
        editingCategory={editingCategory}
      />
      <ResetModal
        visible={showResetModal}
        onClose={() => { setShowResetModal(false); setResetCategory(undefined); }}
        category={resetCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sortBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    paddingTop: 10,
  },
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
  sortMenuTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortMenuItemText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
});
