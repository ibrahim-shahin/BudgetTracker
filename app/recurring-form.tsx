import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import { type Frequency, FREQUENCY_LABELS, LIMITS } from '@/types';
import { confirm } from '@/utils/confirm';
import { addDays, formatDayLabel, today } from '@/utils/dates';
import { successFeedback, tapFeedback, warningFeedback } from '@/utils/haptics';
import { closeAfterKeyboard } from '@/utils/keyboard';
import { amountErrorMessage, amountInputValue, cleanAmountInput, currencyDecimals, parseAmount } from '@/utils/money';
import { nextDueDate } from '@/utils/recurring';

const FREQUENCIES: Frequency[] = ['weekly', 'monthly', 'yearly'];

export default function RecurringFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const categories = useBudgetStore(s => s.categories);
  const currency = useBudgetStore(s => s.currency);
  const addRecurring = useBudgetStore(s => s.addRecurring);
  const updateRecurring = useBudgetStore(s => s.updateRecurring);
  const setPaused = useBudgetStore(s => s.setRecurringPaused);
  const deleteRecurring = useBudgetStore(s => s.deleteRecurring);
  const decimals = currencyDecimals(currency);

  const [editing] = useState(() => (params.id ? useBudgetStore.getState().recurring.find(r => r.id === params.id) : undefined));
  const [amount, setAmount] = useState(editing ? amountInputValue(editing.amount, decimals) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? (categories.length === 1 ? categories[0].id : ''));
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? 'monthly');
  const [startDate, setStartDate] = useState(editing?.startDate ?? today());
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [paused, setPausedState] = useState(editing?.paused ?? false);
  const [error, setError] = useState('');
  const closingRef = useRef(false);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    closeAfterKeyboard(() => router.back());
  };

  const save = () => {
    if (closingRef.current) return;
    const parsed = parseAmount(amount, decimals);
    if (!parsed.ok || parsed.minor === 0) {
      setError(parsed.ok ? 'The amount must be more than zero' : amountErrorMessage(parsed.error, decimals));
      warningFeedback();
      return;
    }
    if (!categories.some(c => c.id === categoryId)) {
      setError('Choose a category');
      warningFeedback();
      return;
    }
    const input = { categoryId, amount: parsed.minor, merchant, notes, tags: editing?.tags ?? [], date: startDate, frequency };
    if (editing) {
      if (paused !== editing.paused) setPaused(editing.id, paused);
      updateRecurring(editing.id, input);
    } else {
      addRecurring(input);
    }
    successFeedback();
    close();
  };

  const remove = async () => {
    if (!editing) return;
    const ok = await confirm('Stop this recurring expense?', 'Expenses it already added stay.', 'Delete', true);
    if (!ok) return;
    deleteRecurring(editing.id);
    close();
  };

  if (params.id && !editing) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.missing, { color: colors.foreground }]}>This recurring expense no longer exists.</Text>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={[styles.link, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const preview = editing ? nextDueDate({ ...editing, startDate, frequency, paused }, today()) : null;
  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={close} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} testID="close-form">
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{editing ? 'Recurring expense' : 'New recurring expense'}</Text>
        <TouchableOpacity onPress={save} accessibilityRole="button" testID="save-recurring-top" hitSlop={10}>
          <Text style={[styles.topSave, { color: colors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} bottomOffset={24}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT ({currency})</Text>
        <TextInput
          testID="recurring-amount-input"
          style={inputStyle}
          keyboardType="decimal-pad"
          placeholder={(0).toFixed(decimals)}
          placeholderTextColor={colors.mutedForeground}
          value={amount}
          onChangeText={text => {
            setAmount(cleanAmountInput(text, decimals));
            setError('');
          }}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY</Text>
        <View style={styles.chips}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.id}
              testID={`recurring-category-${c.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: c.id === categoryId }}
              onPress={() => {
                tapFeedback();
                setCategoryId(c.id);
                setError('');
              }}
              style={[styles.chip, { borderColor: c.id === categoryId ? c.color : colors.border, backgroundColor: c.id === categoryId ? c.color + '22' : colors.card }]}
            >
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <Text style={[styles.chipText, { color: colors.foreground }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>REPEATS</Text>
        <View style={styles.chips}>
          {FREQUENCIES.map(f => (
            <TouchableOpacity
              key={f}
              testID={`frequency-${f}`}
              accessibilityRole="button"
              accessibilityState={{ selected: f === frequency }}
              onPress={() => setFrequency(f)}
              style={[styles.chip, { borderColor: f === frequency ? colors.primary : colors.border, backgroundColor: f === frequency ? colors.accent : colors.card }]}
            >
              <Text style={[styles.chipText, { color: colors.foreground }]}>{FREQUENCY_LABELS[f]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{editing ? 'STARTED' : 'FIRST DATE'}</Text>
        <View style={[styles.dateRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Day before" hitSlop={8} onPress={() => setStartDate(addDays(startDate, -1))}>
            <Feather name="chevron-left" size={20} color={colors.foreground} />
          </Pressable>
          <Text testID="recurring-date" style={[styles.dateText, { color: colors.foreground }]}>
            {formatDayLabel(startDate)}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Day after" hitSlop={8} onPress={() => setStartDate(addDays(startDate, 1))}>
            <Feather name="chevron-right" size={20} color={colors.foreground} />
          </Pressable>
        </View>
        {frequency !== 'weekly' && Number(startDate.slice(8)) > 28 ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>In shorter months it is added on their last day.</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>MERCHANT</Text>
        <TextInput testID="recurring-merchant-input" style={inputStyle} placeholder="e.g. Rent" placeholderTextColor={colors.mutedForeground} value={merchant} onChangeText={setMerchant} maxLength={LIMITS.merchant} />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>NOTES</Text>
        <TextInput style={inputStyle} placeholder="Optional" placeholderTextColor={colors.mutedForeground} value={notes} onChangeText={setNotes} maxLength={LIMITS.notes} />

        {editing ? (
          <View style={[styles.pauseRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pauseTitle, { color: colors.foreground }]}>Paused</Text>
              <Text style={[styles.hint, { color: colors.mutedForeground, marginTop: 2 }]}>
                {paused ? 'Dates while paused are skipped.' : preview ? `Next on ${formatDayLabel(preview)}.` : ''}
              </Text>
            </View>
            <Switch testID="recurring-paused" value={paused} onValueChange={setPausedState} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        ) : null}

        {error ? (
          <Text testID="recurring-error" style={[styles.error, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity testID="save-recurring" style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save} activeOpacity={0.85}>
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{editing ? 'Save changes' : 'Save'}</Text>
        </TouchableOpacity>
        {editing ? (
          <TouchableOpacity testID="delete-recurring" style={[styles.deleteBtn, { borderColor: colors.destructive }]} onPress={() => void remove()}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>Stop repeating</Text>
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
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, lineHeight: 18 },
  link: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  pauseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, borderWidth: 1, borderRadius: 12, padding: 14 },
  pauseTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 12 },
  saveBtn: { marginTop: 28, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  deleteBtn: { marginTop: 12, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1 },
  deleteText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
