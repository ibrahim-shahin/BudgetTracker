import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountCell from '@/components/AmountCell';
import EmptyState from '@/components/EmptyState';
import PeriodSwitcher from '@/components/PeriodSwitcher';
import { useColors } from '@/hooks/useColors';
import { useBudgetMonth, useViewedPeriod } from '@/hooks/usePeriod';
import { useBudgetStore } from '@/store/budgetStore';
import { budgetFor, expensesInPeriod, merchantTotals, sumAmounts } from '@/utils/budget';
import { formatPeriodShort, periodProgress, shiftPeriod, today } from '@/utils/dates';
import { formatMoney, percentOf } from '@/utils/money';

const TREND_MONTHS = 6;

function Bar({ progress, color, track, height = 8 }: { progress: number; color: string; track: string; height?: number }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const categories = useBudgetStore(s => s.categories);
  const expenses = useBudgetStore(s => s.expenses);
  const currency = useBudgetStore(s => s.currency);
  const { period, current, startDay, setPeriod } = useViewedPeriod();
  const { periodExpenses, rows, totals } = useBudgetMonth(period);
  const track = colors.isDark ? colors.border : '#E2E8F0';

  const byCategory = useMemo(() => [...rows].filter(r => r.spent > 0 || r.budget > 0).sort((a, b) => b.spent - a.spent), [rows]);
  const merchants = useMemo(() => merchantTotals(periodExpenses).slice(0, 6), [periodExpenses]);

  // The last six budget months up to the one shown, oldest first.
  const trend = useMemo(() => {
    return Array.from({ length: TREND_MONTHS }, (_, i) => shiftPeriod(period, i - (TREND_MONTHS - 1))).map(key => ({
      key,
      spent: sumAmounts(expensesInPeriod(expenses, key, startDay)),
      budget: categories.reduce((sum, c) => sum + budgetFor(c, key), 0),
    }));
  }, [expenses, categories, period, startDay]);
  const trendMax = Math.max(1, ...trend.map(t => Math.max(t.spent, t.budget)));

  const { days, elapsed } = periodProgress(period, startDay, today());
  const dailyAverage = elapsed > 0 ? Math.round(totals.spent / elapsed) : 0;
  // Only the month in progress gets a forecast.
  const projected = period === current && elapsed > 0 && elapsed < days ? Math.round((totals.spent / elapsed) * days) : null;

  if (categories.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState icon="bar-chart-2" title="No data yet" description="Add categories and expenses to see where your money goes." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Insights</Text>
        <PeriodSwitcher period={period} current={current} startDay={startDay} onChange={setPeriod} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>OVERVIEW</Text>
          <View style={styles.grid}>
            <AmountCell testID="overview-budget" label="Budget" minor={totals.budget} currency={currency} />
            <AmountCell testID="overview-spent" label="Spent" minor={totals.spent} currency={currency} />
            <View style={styles.cell} testID="overview-overspent">
              <Text style={[styles.cellCaption, { color: colors.mutedForeground }]}>CATEGORIES</Text>
              <Text style={[styles.cellValue, { color: totals.overspent > 0 ? colors.destructive : colors.success }]}>{totals.overspent}</Text>
              <Text style={[styles.cellLabel, { color: colors.mutedForeground }]}>Over budget</Text>
            </View>
          </View>
          {totals.budget > 0 ? (
            <View style={styles.overall}>
              <Text style={[styles.overallText, { color: colors.mutedForeground }]}>
                {percentOf(totals.spent, totals.budget)}% of the budget used
              </Text>
              <Bar progress={totals.spent / totals.budget} color={totals.spent > totals.budget ? colors.destructive : colors.primary} track={track} height={12} />
            </View>
          ) : null}
          <View style={styles.pace}>
            <Text testID="daily-average" style={[styles.paceText, { color: colors.mutedForeground }]}>
              {formatMoney(dailyAverage, currency)} a day on average
            </Text>
            {projected !== null ? (
              <Text
                testID="projection"
                style={[styles.paceText, { color: totals.budget > 0 && projected > totals.budget ? colors.destructive : colors.mutedForeground }]}
              >
                At this pace: {formatMoney(projected, currency)} by the end of the month
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>BY CATEGORY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {byCategory.length === 0 ? (
            <Text style={[styles.none, { color: colors.mutedForeground }]}>Nothing spent this month.</Text>
          ) : (
            byCategory.map((row, i) => {
              const over = row.budget > 0 && row.remaining < 0;
              return (
                <View
                  key={row.category.id}
                  testID={`insight-category-${row.category.id}`}
                  style={[styles.row, i < byCategory.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.dot, { backgroundColor: row.category.color + '22' }]}>
                    <Feather name={row.category.icon as 'tag'} size={14} color={row.category.color} />
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                        {row.category.name}
                      </Text>
                      <Text style={[styles.rowAmount, { color: over ? colors.destructive : colors.foreground }]}>{formatMoney(row.spent, currency)}</Text>
                    </View>
                    {row.budget > 0 ? (
                      <>
                        <Bar progress={row.spent / row.budget} color={over ? colors.destructive : row.category.color} track={track} height={6} />
                        <Text style={[styles.rowSub, { color: over ? colors.destructive : colors.mutedForeground }]}>
                          {over
                            ? `${formatMoney(-row.remaining, currency)} over ${formatMoney(row.budget, currency)}`
                            : `${formatMoney(row.remaining, currency)} left of ${formatMoney(row.budget, currency)}`}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                        No budget · {percentOf(row.spent, totals.spent)}% of spending
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {merchants.length > 0 ? (
          <>
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>TOP MERCHANTS</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {merchants.map((m, i) => (
                <View
                  key={m.name}
                  style={[styles.row, i < merchants.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.rank, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.rankText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={[styles.rowAmount, { color: colors.foreground }]}>{formatMoney(m.total, currency)}</Text>
                    </View>
                    <Bar progress={m.total / merchants[0].total} color={colors.primary} track={track} height={4} />
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                      {m.count} time{m.count === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>LAST {TREND_MONTHS} MONTHS</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="trend">
          <View style={styles.trend}>
            {trend.map(t => {
              const over = t.budget > 0 && t.spent > t.budget;
              return (
                <View key={t.key} style={styles.trendColumn} accessible accessibilityLabel={`${formatPeriodShort(t.key)}: ${formatMoney(t.spent, currency)}`}>
                  <View style={styles.trendBars}>
                    <View style={[styles.trendBudget, { height: `${(t.budget / trendMax) * 100}%`, borderColor: colors.mutedForeground }]} />
                    <View
                      style={[
                        styles.trendSpent,
                        { height: `${(t.spent / trendMax) * 100}%`, backgroundColor: over ? colors.destructive : t.key === period ? colors.primary : colors.primary + '88' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.trendLabel, { color: t.key === period ? colors.foreground : colors.mutedForeground }]}>{formatPeriodShort(t.key)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.legend, { color: colors.mutedForeground }]}>Bars: spent · outline: budget</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  content: { padding: 16 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  cardTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 12 },
  grid: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  cellCaption: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  cellValue: { fontSize: 16, fontFamily: 'Inter_700Bold', marginVertical: 1 },
  cellLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  overall: { marginTop: 16, gap: 8 },
  overallText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  pace: { marginTop: 12, gap: 4 },
  paceText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  sectionHeader: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  none: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, gap: 6, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },
  rowAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  trend: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 10 },
  trendColumn: { flex: 1, alignItems: 'center', height: '100%' },
  trendBars: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  trendBudget: { position: 'absolute', bottom: 0, width: '80%', borderWidth: 1, borderStyle: 'dashed', borderRadius: 4 },
  trendSpent: { width: '56%', borderRadius: 4, minHeight: 2 },
  trendLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 6 },
  legend: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 10, textAlign: 'center' },
});
