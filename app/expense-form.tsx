import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import { LIMITS } from '@/types';
import { confirm } from '@/utils/confirm';
import { addDays, formatDayLabel, isLocalDate, today } from '@/utils/dates';
import { successFeedback, tapFeedback, warningFeedback } from '@/utils/haptics';
import { closeAfterKeyboard } from '@/utils/keyboard';
import { amountErrorMessage, amountInputValue, cleanAmountInput, currencyDecimals, parseAmount } from '@/utils/money';
import { normalizeForSearch } from '@/utils/search';

function splitTags(text: string): string[] {
  return text
    .split(/[,،#]/)
    .map(t => t.trim())
    .filter(Boolean);
}

export default function ExpenseFormScreen() {
  const params = useLocalSearchParams<{ id?: string; categoryId?: string; date?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const categories = useBudgetStore(s => s.categories);
  const expenses = useBudgetStore(s => s.expenses);
  const currency = useBudgetStore(s => s.currency);
  const addExpense = useBudgetStore(s => s.addExpense);
  const updateExpense = useBudgetStore(s => s.updateExpense);
  const deleteExpense = useBudgetStore(s => s.deleteExpense);
  const decimals = currencyDecimals(currency);

  // Read once: the form keeps what the user types even if the store changes.
  const [editing] = useState(() => (params.id ? useBudgetStore.getState().expenses.find(e => e.id === params.id) : undefined));
  const [amount, setAmount] = useState(editing ? amountInputValue(editing.amount, decimals) : '');
  const [categoryId, setCategoryId] = useState(
    editing?.categoryId ?? (categories.some(c => c.id === params.categoryId) ? params.categoryId! : categories.length === 1 ? categories[0].id : ''),
  );
  const [date, setDate] = useState(editing?.date ?? (isLocalDate(params.date) ? params.date : today()));
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [tags, setTags] = useState(editing?.tags.join(', ') ?? '');
  const [amountError, setAmountError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const closingRef = useRef(false);

  // The merchants used most in the chosen category, to pick with one tap.
  const suggestions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const e of expenses) {
      if (e.categoryId !== categoryId || !e.merchant) continue;
      const key = normalizeForSearch(e.merchant);
      const row = counts.get(key) ?? { name: e.merchant, count: 0 };
      row.count += 1;
      counts.set(key, row);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 4).map(r => r.name);
  }, [expenses, categoryId]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    closeAfterKeyboard(() => router.back());
  };

  const save = () => {
    if (closingRef.current) return;
    const parsed = parseAmount(amount, decimals);
    let valid = true;
    if (!parsed.ok) {
      setAmountError(amountErrorMessage(parsed.error, decimals));
      valid = false;
    } else if (parsed.minor === 0) {
      setAmountError('The amount must be more than zero');
      valid = false;
    }
    if (!categories.some(c => c.id === categoryId)) {
      setCategoryError('Choose a category');
      valid = false;
    }
    if (!valid || !parsed.ok) {
      warningFeedback();
      return;
    }
    const input = { categoryId, amount: parsed.minor, merchant, notes, tags: splitTags(tags), date };
    if (editing) updateExpense(editing.id, input);
    else addExpense(input);
    successFeedback();
    close();
  };

  const remove = async () => {
    if (!editing) return;
    const ok = await confirm('Delete this expense?', "This can't be undone.", 'Delete', true);
    if (!ok) return;
    warningFeedback();
    deleteExpense(editing.id);
    close();
  };

  if (params.id && !editing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.missing, { color: colors.foreground }]}>This expense no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} testID="close-form">
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{editing ? 'Edit expense' : 'New expense'}</Text>
        <TouchableOpacity onPress={save} accessibilityRole="button" testID="save-expense-top" hitSlop={10}>
          <Text style={[styles.topSave, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} bottomOffset={24}>
        <View style={[styles.amountWrap, { borderColor: amountError ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.currency, { color: colors.mutedForeground }]}>{currency}</Text>
          <TextInput
            testID="amount-input"
            accessibilityLabel={`Amount in ${currency}`}
            style={[styles.amountInput, { color: colors.foreground }]}
            placeholder={(0).toFixed(decimals)}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={text => {
              setAmount(cleanAmountInput(text, decimals));
              setAmountError('');
            }}
            autoFocus={!editing}
            returnKeyType="done"
          />
        </View>
        {amountError ? (
          <Text testID="amount-error" style={[styles.error, { color: colors.destructive }]}>
            {amountError}
          </Text>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
        <View style={styles.chips}>
          {categories.map(c => {
            const selected = c.id === categoryId;
            return (
              <TouchableOpacity
                key={c.id}
                testID={`category-chip-${c.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  tapFeedback();
                  setCategoryId(c.id);
                  setCategoryError('');
                }}
                style={[
                  styles.chip,
                  { borderColor: selected ? c.color : colors.border, backgroundColor: selected ? c.color + '22' : colors.card },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={[styles.chipText, { color: colors.foreground }]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {categoryError ? <Text style={[styles.error, { color: colors.destructive }]}>{categoryError}</Text> : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>DATE</Text>
        <View style={[styles.dateRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable testID="date-previous" accessibilityRole="button" accessibilityLabel="Day before" hitSlop={8} onPress={() => setDate(addDays(date, -1))}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text testID="date-label" style={[styles.dateText, { color: colors.foreground }]}>
            {formatDayLabel(date)}
          </Text>
          <Pressable testID="date-next" accessibilityRole="button" accessibilityLabel="Day after" hitSlop={8} onPress={() => setDate(addDays(date, 1))}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        {date !== today() ? (
          <TouchableOpacity testID="date-today" onPress={() => setDate(today())} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.primary }]}>Use today</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>MERCHANT</Text>
        <TextInput
          testID="merchant-input"
          style={inputStyle}
          placeholder="e.g. Carrefour"
          placeholderTextColor={colors.mutedForeground}
          value={merchant}
          onChangeText={setMerchant}
          maxLength={LIMITS.merchant}
          returnKeyType="next"
        />
        {merchant === '' && suggestions.length > 0 ? (
          <View style={styles.chips}>
            {suggestions.map(name => (
              <TouchableOpacity
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`Merchant ${name}`}
                onPress={() => setMerchant(name)}
                style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted }]}
              >
                <Text style={[styles.chipText, { color: colors.foreground }]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>NOTES</Text>
        <TextInput
          testID="notes-input"
          style={[inputStyle, styles.notes]}
          placeholder="Optional"
          placeholderTextColor={colors.mutedForeground}
          value={notes}
          onChangeText={setNotes}
          maxLength={LIMITS.notes}
          multiline
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>TAGS</Text>
        <TextInput
          testID="tags-input"
          style={inputStyle}
          placeholder="weekly, gift (separate with commas)"
          placeholderTextColor={colors.mutedForeground}
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
        />

        <TouchableOpacity testID="save-expense" style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save} activeOpacity={0.85}>
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{editing ? 'Save changes' : 'Save expense'}</Text>
        </TouchableOpacity>

        {editing ? (
          <TouchableOpacity testID="delete-expense" style={[styles.deleteBtn, { borderColor: colors.destructive }]} onPress={() => void remove()}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete expense</Text>
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
  amountWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  currency: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  amountInput: { flex: 1, fontSize: 32, fontFamily: 'Inter_700Bold', paddingVertical: 4 },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 6 },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  link: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 10, lineHeight: 18 },
  saveBtn: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1 },
  deleteText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
