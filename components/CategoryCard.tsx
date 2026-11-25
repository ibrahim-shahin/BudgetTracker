import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import ProgressBar from '@/components/ProgressBar';
import type { Category } from '@/types';

interface Props {
  category: Category;
  onAddExpense: (category: Category) => void;
  onEdit: (category: Category) => void;
  onReset: (category: Category) => void;
}

export default function CategoryCard({ category, onAddExpense, onEdit, onReset }: Props) {
  const colors = useColors();
  const [menuVisible, setMenuVisible] = useState(false);
  const currency = useBudgetStore(s => s.currency);
  const spent = useBudgetStore(s => s.getCategoryTotal(category.id));
  const remaining = category.budget - spent;
  const isOverspent = remaining < 0;
  const progress = category.budget > 0 ? spent / category.budget : 0;
  const lastDate = useBudgetStore(s => s.getLastExpenseDate(category.id));
  const togglePin = useBudgetStore(s => s.togglePin);
  const deleteCategory = useBudgetStore(s => s.deleteCategory);

  const percentText =
    category.budget > 0
      ? `${Math.round((spent / category.budget) * 100)}%`
      : '—';

  const lastActivityText = lastDate
    ? format(new Date(lastDate), 'MMM d')
    : 'No expenses';

  const handleCardPress = () => {
    Haptics.selectionAsync();
    router.push(`/category/${category.id}` as any);
  };

  const handleAddExpense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddExpense(category);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Category',
      `Delete "${category.name}" and all its data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteCategory(category.id);
          },
        },
      ]
    );
  };

  const MenuModal = () => (
    <Modal
      visible={menuVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMenuVisible(false)}
    >
      <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
        <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenuVisible(false); onEdit(category); }}
          >
            <Feather name="edit-2" size={16} color={colors.foreground} />
            <Text style={[styles.menuItemText, { color: colors.foreground }]}>Edit</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenuVisible(false); togglePin(category.id); }}
          >
            <Feather name={category.pinned ? 'star' : 'star'} size={16} color={colors.warning} />
            <Text style={[styles.menuItemText, { color: colors.foreground }]}>
              {category.pinned ? 'Unpin' : 'Pin'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenuVisible(false); onReset(category); }}
          >
            <Feather name="refresh-cw" size={16} color={colors.warning} />
            <Text style={[styles.menuItemText, { color: colors.foreground }]}>Reset cycle</Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.menuItemText, { color: colors.destructive }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <>
      <MenuModal />
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isOverspent ? colors.destructive : colors.border,
            borderWidth: isOverspent ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: colors.radius,
          },
        ]}
        onPress={handleCardPress}
        activeOpacity={0.85}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: category.color + '22' }]}>
              <Feather name={category.icon as any} size={18} color={category.color} />
            </View>
            <View style={styles.nameBlock}>
              <Text style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>
                {category.name}
              </Text>
              <Text style={[styles.lastActivity, { color: colors.mutedForeground }]}>
                {lastActivityText}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {category.pinned && (
              <Feather name="star" size={13} color={colors.warning} style={{ marginRight: 6 }} />
            )}
            {isOverspent && (
              <View style={[styles.overspentBadge, { backgroundColor: colors.dangerLight }]}>
                <Text style={[styles.overspentText, { color: colors.destructive }]}>OVER</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setMenuVisible(true); }}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.budgetRow}>
          <Text style={[styles.spentAmount, { color: colors.foreground }]}>
            {currency} {spent.toFixed(2)}
          </Text>
          <Text style={[styles.budgetAmount, { color: colors.mutedForeground }]}>
            of {currency} {category.budget.toFixed(2)}
          </Text>
          <Text style={[styles.percent, { color: isOverspent ? colors.destructive : colors.mutedForeground }]}>
            {percentText}
          </Text>
        </View>

        <View style={styles.progressWrap}>
          <ProgressBar progress={progress} color={category.color} height={7} />
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={[styles.remainingLabel, { color: colors.mutedForeground }]}>Remaining</Text>
            <Text
              style={[
                styles.remainingValue,
                { color: isOverspent ? colors.destructive : colors.success },
              ]}
            >
              {isOverspent ? '−' : ''}{currency} {Math.abs(remaining).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: category.color }]}
            onPress={handleAddExpense}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  lastActivity: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  overspentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overspentText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  spentAmount: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  budgetAmount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  percent: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  progressWrap: {
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remainingValue: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContainer: {
    width: 220,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
});
