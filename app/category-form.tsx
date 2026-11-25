import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { currentPeriod, useBudgetStore } from '@/store/budgetStore';
import { CATEGORY_COLORS, CATEGORY_ICONS, LIMITS } from '@/types';
import { budgetFor } from '@/utils/budget';
import { confirm } from '@/utils/confirm';
import { formatPeriodLabel } from '@/utils/dates';
import { successFeedback, tapFeedback, warningFeedback } from '@/utils/haptics';
import { closeAfterKeyboard } from '@/utils/keyboard';
import { amountErrorMessage, amountInputValue, cleanAmountInput, currencyDecimals, parseAmount } from '@/utils/money';

export default function CategoryFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currency = useBudgetStore(s => s.currency);
  const startDay = useBudgetStore(s => s.periodStartDay);
  const addCategory = useBudgetStore(s => s.addCategory);
  const updateCategory = useBudgetStore(s => s.updateCategory);
  const deleteCategory = useBudgetStore(s => s.deleteCategory);
  const decimals = currencyDecimals(currency);
  const period = currentPeriod(startDay);

  const [editing] = useState(() => (params.id ? useBudgetStore.getState().categories.find(c => c.id === params.id) : undefined));
  const editingBudget = editing ? budgetFor(editing, period) : 0;
  const [name, setName] = useState(editing?.name ?? '');
  const [budget, setBudget] = useState(editing && editingBudget > 0 ? amountInputValue(editingBudget, decimals) : '');
  const [color, setColor] = useState(editing?.color ?? CATEGORY_COLORS[5]);
  const [icon, setIcon] = useState<string>(editing?.icon ?? CATEGORY_ICONS[0]);
  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const closingRef = useRef(false);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    closeAfterKeyboard(() => router.back());
  };

  const save = () => {
    if (closingRef.current) return;
    let valid = true;
    if (!name.trim()) {
      setNameError('Give the category a name');
      valid = false;
    }
    // An empty budget is fine: the category just tracks spending.
    const parsed = budget.trim() === '' ? ({ ok: true, minor: 0 } as const) : parseAmount(budget, decimals);
    if (!parsed.ok) {
      setBudgetError(amountErrorMessage(parsed.error, decimals));
      valid = false;
    }
    if (!valid || !parsed.ok) {
      warningFeedback();
      return;
    }
    const input = { name, budget: parsed.minor, color, icon };
    if (editing) updateCategory(editing.id, input, period);
    else addCategory(input, period);
    successFeedback();
    close();
  };

  const remove = async () => {
    if (!editing) return;
    const count = useBudgetStore.getState().expenses.filter(e => e.categoryId === editing.id).length;
    const ok = await confirm(
      `Delete ${editing.name}?`,
      count > 0 ? `Its ${count} expense${count === 1 ? '' : 's'} and recurring expenses will be deleted too. This can't be undone.` : "This can't be undone.",
      'Delete',
      true,
    );
    if (!ok) return;
    warningFeedback();
    deleteCategory(editing.id);
    closingRef.current = true;
    // The category's own screen may be underneath; go back to the list.
    closeAfterKeyboard(() => (router.canDismiss() ? router.dismissAll() : router.back()));
  };

  if (params.id && !editing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.missing, { color: colors.foreground }]}>This category no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} testID="close-form">
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{editing ? 'Edit category' : 'New category'}</Text>
        <TouchableOpacity onPress={save} accessibilityRole="button" testID="save-category-top" hitSlop={10}>
          <Text style={[styles.topSave, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} bottomOffset={24}>
        <View style={styles.previewRow}>
          <View style={[styles.preview, { backgroundColor: color + '22' }]}>
            <Feather name={icon as 'tag'} size={28} color={color} />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>NAME</Text>
        <TextInput
          testID="category-name-input"
          style={[styles.input, { borderColor: nameError ? colors.destructive : colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          placeholder="e.g. Groceries"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={text => {
            setName(text);
            setNameError('');
          }}
          maxLength={LIMITS.categoryName}
          autoFocus={!editing}
          returnKeyType="next"
        />
        {nameError ? <Text style={[styles.error, { color: colors.destructive }]}>{nameError}</Text> : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>MONTHLY BUDGET ({currency})</Text>
        <TextInput
          testID="category-budget-input"
          style={[styles.input, { borderColor: budgetError ? colors.destructive : colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          placeholder="Leave empty to just track spending"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          value={budget}
          onChangeText={text => {
            setBudget(cleanAmountInput(text, decimals));
            setBudgetError('');
          }}
          returnKeyType="done"
        />
        {budgetError ? (
          <Text testID="budget-error" style={[styles.error, { color: colors.destructive }]}>
            {budgetError}
          </Text>
        ) : null}
        {editing ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            A new budget applies from {formatPeriodLabel(period, startDay)}. Earlier months keep theirs.
          </Text>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>COLOUR</Text>
        <View style={styles.grid}>
          {CATEGORY_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              testID={`color-${c}`}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              accessibilityState={{ selected: c === color }}
              style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchSelected]}
              onPress={() => {
                tapFeedback();
                setColor(c);
              }}
            >
              {c === color ? <Feather name="check" size={14} color="#fff" /> : null}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>ICON</Text>
        <View style={styles.grid}>
          {CATEGORY_ICONS.map(name => (
            <TouchableOpacity
              key={name}
              testID={`icon-${name}`}
              accessibilityRole="button"
              accessibilityLabel={`Icon ${name}`}
              accessibilityState={{ selected: name === icon }}
              style={[
                styles.iconOption,
                { backgroundColor: name === icon ? color + '22' : colors.muted, borderColor: name === icon ? color : 'transparent' },
              ]}
              onPress={() => {
                tapFeedback();
                setIcon(name);
              }}
            >
              <Feather name={name} size={20} color={name === icon ? color : colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="save-category" style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save} activeOpacity={0.85}>
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{editing ? 'Save changes' : 'Create category'}</Text>
        </TouchableOpacity>

        {editing ? (
          <TouchableOpacity testID="delete-category" style={[styles.deleteBtn, { borderColor: colors.destructive }]} onPress={() => void remove()}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete category</Text>
          </TouchableOpacity>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  missing: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  topSave: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  body: { padding: 16 },
  previewRow: { alignItems: 'center', marginTop: 4 },
  preview: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 6 },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, lineHeight: 18 },
  link: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  iconOption: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  saveBtn: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1 },
  deleteText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
