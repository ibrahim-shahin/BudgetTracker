import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import ExpenseRow from '@/components/ExpenseRow';
import PeriodSwitcher from '@/components/PeriodSwitcher';
import { useColors } from '@/hooks/useColors';
import { useViewedPeriod } from '@/hooks/usePeriod';
import { useBudgetStore } from '@/store/budgetStore';
import type { Category, Expense } from '@/types';
import { expensesInPeriod, sumAmounts } from '@/utils/budget';
import { formatDayLabel } from '@/utils/dates';
import { amountInputValue, currencyDecimals, formatMoney } from '@/utils/money';
import { matchesWords, searchWords } from '@/utils/search';

interface DaySection {
  title: string;
  total: number;
  data: Expense[];
}

function byDay(expenses: Expense[]): DaySection[] {
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const sections: DaySection[] = [];
  for (const expense of sorted) {
    const last = sections[sections.length - 1];
    if (last && last.data[0].date === expense.date) {
      last.data.push(expense);
      last.total += expense.amount;
    } else {
      sections.push({ title: expense.date, total: expense.amount, data: [expense] });
    }
  }
  return sections;
}

/** The fields a search looks through: merchant, notes, tags, category and amount. */
function searchFields(expense: Expense, category: Category | undefined, decimals: number): string[] {
  return [expense.merchant, expense.notes, ...expense.tags, category?.name ?? '', amountInputValue(expense.amount, decimals)];
}

export default function ExpensesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const expenses = useBudgetStore(s => s.expenses);
  const categories = useBudgetStore(s => s.categories);
  const currency = useBudgetStore(s => s.currency);
  const { period, current, startDay, setPeriod } = useViewedPeriod();
  const [query, setQuery] = useState('');

  const categoryById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const searching = searchWords(query).length > 0;

  // A search looks through every month; otherwise the list shows the chosen month.
  const shown = useMemo(() => {
    const words = searchWords(query);
    if (words.length > 0) {
      const decimals = currencyDecimals(currency);
      return expenses.filter(e => matchesWords(words, searchFields(e, categoryById.get(e.categoryId), decimals)));
    }
    return expensesInPeriod(expenses, period, startDay);
  }, [expenses, categoryById, currency, query, period, startDay]);

  const sections = useMemo(() => byDay(shown), [shown]);
  const total = sumAmounts(shown);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Expenses</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="search-input"
            accessibilityLabel="Search expenses"
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search merchant, note, tag or amount"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
        {searching ? null : <PeriodSwitcher period={period} current={current} startDay={startDay} onChange={setPeriod} />}
        <Text testID="expenses-total" style={[styles.total, { color: colors.mutedForeground }]}>
          {shown.length} expense{shown.length === 1 ? '' : 's'} · {formatMoney(total, currency)}
          {searching ? ' · all months' : ''}
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={e => e.id}
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            category={categoryById.get(item.categoryId)}
            currency={currency}
            onPress={e => router.push({ pathname: '/expense-form', params: { id: e.id } })}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{formatDayLabel(section.title)}</Text>
            <Text style={[styles.sectionTotal, { color: colors.mutedForeground }]}>{formatMoney(section.total, currency)}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          searching ? (
            <EmptyState icon="search" title="No matches" description="Try another word, or part of a merchant's name." />
          ) : (
            <EmptyState icon="inbox" title="No expenses this month" description="Expenses you add show up here, newest first." />
          )
        }
        contentContainerStyle={[styles.list, { paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', padding: 0 },
  total: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  list: { flexGrow: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTotal: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
