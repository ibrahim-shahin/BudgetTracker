import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ProgressBar from '@/components/ProgressBar';
import { useColors } from '@/hooks/useColors';
import type { CategoryMonth } from '@/utils/budget';
import { formatDayLabel } from '@/utils/dates';
import { tapFeedback } from '@/utils/haptics';
import { formatMoney, percentOf } from '@/utils/money';

interface Props {
  row: CategoryMonth;
  currency: string;
  onOpen: () => void;
  onAddExpense: () => void;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

export default function CategoryCard({ row, currency, onOpen, onAddExpense, onEdit, onTogglePin, onDelete }: Props) {
  const colors = useColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const { category, budget, spent, remaining, lastDate } = row;
  const hasBudget = budget > 0;
  const isOverspent = hasBudget && remaining < 0;

  const choose = (action: () => void) => {
    setMenuVisible(false);
    action();
  };

  return (
    <>
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)} testID="category-menu-backdrop">
          <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {category.name}
            </Text>
            <MenuItem icon="edit-2" label="Edit" color={colors.foreground} onPress={() => choose(onEdit)} />
            <MenuItem icon="star" label={category.pinned ? 'Unpin' : 'Pin to top'} color={colors.foreground} onPress={() => choose(onTogglePin)} />
            <MenuItem icon="trash-2" label="Delete" color={colors.destructive} onPress={() => choose(onDelete)} />
          </View>
        </Pressable>
      </Modal>

      <TouchableOpacity
        testID={`category-${category.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${category.name}: ${formatMoney(spent, currency)} spent${hasBudget ? ` of ${formatMoney(budget, currency)}` : ''}`}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isOverspent ? colors.destructive : colors.border,
            borderWidth: isOverspent ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: colors.radius,
          },
        ]}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        activeOpacity={0.85}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: category.color + '22' }]}>
              <Feather name={category.icon as 'tag'} size={18} color={category.color} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>
                {category.name}
              </Text>
              <Text style={[styles.lastActivity, { color: colors.mutedForeground }]}>
                {lastDate ? `Last: ${formatDayLabel(lastDate)}` : 'No expenses this month'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {category.pinned ? <Feather name="star" size={13} color={colors.warning} accessibilityLabel="Pinned" /> : null}
            {isOverspent ? (
              <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.badgeText, { color: colors.destructive }]}>OVER</Text>
              </View>
            ) : null}
            <TouchableOpacity
              testID={`category-menu-${category.id}`}
              accessibilityRole="button"
              accessibilityLabel={`More for ${category.name}`}
              onPress={() => {
                tapFeedback();
                setMenuVisible(true);
              }}
              hitSlop={10}
            >
              <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.spent, { color: colors.foreground }]}>{formatMoney(spent, currency)}</Text>
          <Text style={[styles.budget, { color: colors.mutedForeground }]} numberOfLines={1}>
            {hasBudget ? `of ${formatMoney(budget, currency)}` : 'no budget'}
          </Text>
          {hasBudget ? (
            <Text style={[styles.percent, { color: isOverspent ? colors.destructive : colors.mutedForeground }]}>
              {percentOf(spent, budget)}%
            </Text>
          ) : null}
        </View>

        {hasBudget ? (
          <View style={styles.progressWrap}>
            <ProgressBar progress={spent / budget} color={category.color} height={7} />
          </View>
        ) : null}

        <View style={styles.footer}>
          {hasBudget ? (
            <View>
              <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>{isOverspent ? 'Over by' : 'Left'}</Text>
              <Text
                testID={`category-remaining-${category.id}`}
                style={[styles.remainingValue, { color: isOverspent ? colors.destructive : colors.success }]}
              >
                {formatMoney(Math.abs(remaining), currency)}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <TouchableOpacity
            testID={`category-add-${category.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Add an expense to ${category.name}`}
            style={[styles.addBtn, { backgroundColor: category.color }]}
            onPress={onAddExpense}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );
}

function MenuItem({ icon, label, color, onPress }: { icon: 'edit-2' | 'star' | 'trash-2'; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} accessibilityRole="button">
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.menuItemText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nameBlock: { flex: 1, minWidth: 0 },
  categoryName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  lastActivity: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10 },
  spent: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  budget: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  percent: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressWrap: { marginBottom: 12 },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  remainingLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 },
  remainingValue: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  menu: { width: '100%', maxWidth: 320, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  menuTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 16, paddingVertical: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
