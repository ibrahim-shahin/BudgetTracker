import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useColors } from '@/hooks/useColors';
import { getCycleExpenses, useBudgetStore } from '@/store/budgetStore';
import ProgressBar from '@/components/ProgressBar';
import HistoryEventItem from '@/components/HistoryEventItem';
import AddExpenseModal from '@/components/AddExpenseModal';
import ResetModal from '@/components/ResetModal';
import EmptyState from '@/components/EmptyState';
import type { EventType } from '@/types';

type HistoryFilter = 'all' | 'expenses' | 'budget' | 'resets';

const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'budget', label: 'Budget' },
  { key: 'resets', label: 'Resets' },
];

const EXPENSE_TYPES: EventType[] = ['expense_added', 'expense_edited', 'expense_deleted'];
const BUDGET_TYPES: EventType[] = ['category_created', 'category_updated', 'budget_changed'];
const RESET_TYPES: EventType[] = ['category_reset', 'all_reset'];

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const category = useBudgetStore(s => s.categories.find(c => c.id === id));
  const currency = useBudgetStore(s => s.currency);
  const expenses = useBudgetStore(s => s.expenses);
  const events = useBudgetStore(s => s.events);

  // Select the stored arrays and derive from them: a selector that builds a
  // new array on every call makes the screen re-render forever.
  const allExpenses = useMemo(() => (category ? getCycleExpenses(category, expenses) : []), [category, expenses]);
  const allEvents = useMemo(
    () => events
      .filter(e => e.categoryId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [events, id]
  );
  const spent = allExpenses.reduce((sum, e) => sum + e.amount, 0);

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const remaining = (category?.budget ?? 0) - spent;
  const isOverspent = remaining < 0;
  const progress = (category?.budget ?? 0) > 0 ? spent / (category?.budget ?? 1) : 0;

  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      switch (historyFilter) {
        case 'expenses': return EXPENSE_TYPES.includes(e.type);
        case 'budget': return BUDGET_TYPES.includes(e.type);
        case 'resets': return RESET_TYPES.includes(e.type);
        default: return true;
      }
    });
  }, [allEvents, historyFilter]);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (!category) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.navBar, { paddingTop: topPad + 4, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <EmptyState icon="alert-circle" title="Category not found" description="This category may have been deleted." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 4, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>{category.name}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); setShowReset(true); }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Feather name="refresh-cw" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <HistoryEventItem event={item} currency={currency} />
        )}
        ListHeaderComponent={
          <>
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.categoryHeader}>
                <View style={[styles.iconCircle, { backgroundColor: category.color + '22' }]}>
                  <Feather name={category.icon as any} size={24} color={category.color} />
                </View>
                <View style={styles.categoryHeaderInfo}>
                  <Text style={[styles.categoryName, { color: colors.foreground }]}>{category.name}</Text>
                  {category.lastResetAt && (
                    <Text style={[styles.cycleText, { color: colors.mutedForeground }]}>
                      Cycle since {format(new Date(category.lastResetAt), 'MMM d, yyyy')}
                    </Text>
                  )}
                </View>
                {isOverspent && (
                  <View style={[styles.overspentBadge, { backgroundColor: colors.dangerLight }]}>
                    <Feather name="alert-circle" size={14} color={colors.destructive} />
                    <Text style={[styles.overspentText, { color: colors.destructive }]}>OVERSPENT</Text>
                  </View>
                )}
              </View>

              <View style={styles.amountRow}>
                <View style={styles.amountItem}>
                  <Text style={[styles.amountValue, { color: colors.foreground }]}>
                    {currency} {spent.toFixed(2)}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Spent</Text>
                </View>
                <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />
                <View style={styles.amountItem}>
                  <Text style={[styles.amountValue, { color: colors.foreground }]}>
                    {currency} {category.budget.toFixed(2)}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Budget</Text>
                </View>
                <View style={[styles.amountDivider, { backgroundColor: colors.border }]} />
                <View style={styles.amountItem}>
                  <Text style={[styles.amountValue, { color: isOverspent ? colors.destructive : colors.success }]}>
                    {isOverspent ? '−' : ''}{currency} {Math.abs(remaining).toFixed(2)}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Remaining</Text>
                </View>
              </View>

              <View style={styles.progressWrap}>
                <ProgressBar progress={progress} color={category.color} height={8} />
                <Text style={[styles.progressPct, { color: isOverspent ? colors.destructive : colors.mutedForeground }]}>
                  {Math.round(progress * 100)}% used
                </Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{allExpenses.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Expenses</Text>
                </View>
                {allExpenses.length > 0 && (
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>
                      {currency} {(spent / allExpenses.length).toFixed(2)}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Avg expense</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {HISTORY_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: historyFilter === f.key ? colors.primary : colors.card,
                        borderColor: historyFilter === f.key ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => { Haptics.selectionAsync(); setHistoryFilter(f.key); }}
                  >
                    <Text style={[styles.filterChipText, { color: historyFilter === f.key ? colors.primaryForeground : colors.mutedForeground }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>
              HISTORY ({filteredEvents.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon="clock"
            title="No events"
            description={historyFilter === 'all' ? 'Start by adding an expense' : 'No events match this filter'}
          />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: category.color, bottom: bottomPad + 20 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddExpense(true); }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        initialCategoryId={category.id}
      />
      <ResetModal
        visible={showReset}
        onClose={() => setShowReset(false)}
        category={category}
      />
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
  backBtn: {},
  navTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statsCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  cycleText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  overspentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  overspentText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  amountLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountDivider: {
    width: 1,
    height: 32,
  },
  progressWrap: {
    marginBottom: 14,
    gap: 6,
  },
  progressPct: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {},
  statValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  filterRow: {
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  historyTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  listContent: {},
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
