import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import EmptyState from '@/components/EmptyState';

function HorizontalBar({ progress, color, height = 10 }: { progress: number; color: string; height?: number }) {
  const clamp = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ height, backgroundColor: '#E2E8F0', borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${clamp * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export default function Analytics() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const categories = useBudgetStore(s => s.categories);
  const expenses = useBudgetStore(s => s.expenses);
  const currency = useBudgetStore(s => s.currency);
  const getCategoryTotal = useBudgetStore(s => s.getCategoryTotal);

  const totalBudget = useMemo(() => categories.reduce((s, c) => s + c.budget, 0), [categories]);
  const totalSpent = useMemo(() => categories.reduce((s, c) => s + getCategoryTotal(c.id), 0), [categories, getCategoryTotal]);
  const overspentCount = useMemo(
    () => categories.filter(c => getCategoryTotal(c.id) > c.budget).length,
    [categories, getCategoryTotal]
  );

  const categoryData = useMemo(() => {
    return categories
      .map(c => ({
        category: c,
        spent: getCategoryTotal(c.id),
        remaining: c.budget - getCategoryTotal(c.id),
        progress: c.budget > 0 ? getCategoryTotal(c.id) / c.budget : 0,
      }))
      .sort((a, b) => b.spent - a.spent);
  }, [categories, getCategoryTotal]);

  const merchantData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      if (e.merchant) {
        map.set(e.merchant, (map.get(e.merchant) ?? 0) + e.amount);
      }
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, total]) => ({ name, total }));
  }, [expenses]);

  const maxMerchantAmount = merchantData[0]?.total ?? 1;

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (categories.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="bar-chart-2"
          title="No data yet"
          description="Add categories and track expenses to see your analytics"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>OVERVIEW</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryNum, { color: colors.foreground }]}>
                {currency} {totalBudget.toFixed(0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Budget</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryNum, { color: colors.foreground }]}>
                {currency} {totalSpent.toFixed(0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryNum, { color: overspentCount > 0 ? colors.destructive : colors.success }]}>
                {overspentCount}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Overspent</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={styles.overallBarRow}>
              <Text style={[styles.overallLabel, { color: colors.mutedForeground }]}>
                {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}% of total budget used
              </Text>
            </View>
            <HorizontalBar
              progress={totalBudget > 0 ? totalSpent / totalBudget : 0}
              color={totalSpent > totalBudget ? colors.destructive : colors.primary}
              height={12}
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>SPENDING BY CATEGORY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {categoryData.map((item, idx) => {
            const isOverspent = item.remaining < 0;
            return (
              <View
                key={item.category.id}
                style={[
                  styles.categoryRow,
                  idx < categoryData.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.catDot, { backgroundColor: item.category.color + '22' }]}>
                  <Feather name={item.category.icon as any} size={14} color={item.category.color} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catNameRow}>
                    <Text style={[styles.catName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.category.name}
                    </Text>
                    {isOverspent && (
                      <View style={[styles.overBadge, { backgroundColor: colors.dangerLight }]}>
                        <Text style={[styles.overBadgeText, { color: colors.destructive }]}>OVER</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ marginVertical: 6 }}>
                    <HorizontalBar progress={item.progress} color={isOverspent ? colors.destructive : item.category.color} height={6} />
                  </View>
                  <View style={styles.catAmounts}>
                    <Text style={[styles.catSpent, { color: colors.foreground }]}>
                      {currency} {item.spent.toFixed(2)}
                    </Text>
                    <Text style={[styles.catBudget, { color: colors.mutedForeground }]}>
                      of {currency} {item.category.budget.toFixed(2)}
                    </Text>
                    <Text style={[styles.catRemaining, { color: isOverspent ? colors.destructive : colors.success }]}>
                      {isOverspent ? '−' : '+'}{currency} {Math.abs(item.remaining).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {merchantData.length > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>TOP MERCHANTS</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {merchantData.map((item, idx) => (
                <View
                  key={item.name}
                  style={[
                    styles.merchantRow,
                    idx < merchantData.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.merchantRank, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.merchantRankText, { color: colors.mutedForeground }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.merchantInfo}>
                    <Text style={[styles.merchantName, { color: colors.foreground }]}>{item.name}</Text>
                    <View style={styles.merchantBarWrap}>
                      <HorizontalBar progress={item.total / maxMerchantAmount} color={colors.primary} height={4} />
                    </View>
                  </View>
                  <Text style={[styles.merchantAmount, { color: colors.foreground }]}>
                    {currency} {item.total.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {overspentCount > 0 && (
          <>
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>OVERSPENT CATEGORIES</Text>
            <View style={[styles.card, { backgroundColor: colors.dangerLight, borderColor: colors.destructive }]}>
              {categoryData
                .filter(item => item.remaining < 0)
                .map((item, idx, arr) => (
                  <View
                    key={item.category.id}
                    style={[
                      styles.overspentRow,
                      idx < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.destructive + '33' },
                    ]}
                  >
                    <Feather name="alert-circle" size={16} color={colors.destructive} />
                    <View style={styles.overspentInfo}>
                      <Text style={[styles.overspentName, { color: colors.destructive }]}>
                        {item.category.name}
                      </Text>
                      <Text style={[styles.overspentAmount, { color: colors.destructive }]}>
                        Exceeded by {currency} {Math.abs(item.remaining).toFixed(2)}
                      </Text>
                    </View>
                    <Text style={[styles.overspentPct, { color: colors.destructive }]}>
                      {Math.round(item.progress * 100)}%
                    </Text>
                  </View>
                ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    padding: 16,
    gap: 0,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  summaryNum: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  overallBarRow: {
    marginBottom: 8,
  },
  overallLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  catDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  catInfo: {
    flex: 1,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  overBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  catAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catSpent: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  catBudget: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  catRemaining: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  merchantRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantRankText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  merchantBarWrap: {},
  merchantAmount: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  overspentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  overspentInfo: {
    flex: 1,
  },
  overspentName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  overspentAmount: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  overspentPct: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
