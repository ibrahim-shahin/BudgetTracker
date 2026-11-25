import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import type { Category } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialCategoryId?: string;
}

export default function AddExpenseModal({ visible, onClose, initialCategoryId }: Props) {
  const colors = useColors();
  const categories = useBudgetStore(s => s.categories);
  const currency = useBudgetStore(s => s.currency);
  const addExpense = useBudgetStore(s => s.addExpense);

  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId ?? '');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [amountError, setAmountError] = useState('');

  useEffect(() => {
    if (visible) {
      setAmount('');
      setSelectedCategoryId(initialCategoryId ?? (categories[0]?.id ?? ''));
      setMerchant('');
      setNotes('');
      setTags('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmountError('');
    }
  }, [visible, initialCategoryId]);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError('Enter a valid amount');
      return;
    }
    if (!selectedCategoryId) {
      return;
    }
    const tagList = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addExpense({
      categoryId: selectedCategoryId,
      amount: parsed,
      merchant: merchant.trim(),
      notes: notes.trim(),
      tags: tagList,
      date,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>Add Expense</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.amountWrap}>
              <Text style={[styles.currencySymbol, { color: colors.mutedForeground }]}>{currency}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={v => { setAmount(v); setAmountError(''); }}
                autoFocus
              />
            </View>
            {amountError ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{amountError}</Text>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <TouchableOpacity
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              {selectedCategory ? (
                <View style={styles.categoryRow}>
                  <View style={[styles.dot, { backgroundColor: selectedCategory.color }]} />
                  <Text style={[styles.inputText, { color: colors.foreground }]}>
                    {selectedCategory.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
                  Select category
                </Text>
              )}
              <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={[styles.picker, { borderColor: colors.border, backgroundColor: colors.background }]}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.pickerItem,
                      { borderBottomColor: colors.border },
                      cat.id === selectedCategoryId && { backgroundColor: colors.accent },
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(cat.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.dot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.inputText, { color: colors.foreground }]}>{cat.name}</Text>
                    {cat.id === selectedCategoryId && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MERCHANT</Text>
            <TextInput
              style={[styles.input, styles.textInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              placeholder="e.g. Carrefour"
              placeholderTextColor={colors.mutedForeground}
              value={merchant}
              onChangeText={setMerchant}
              returnKeyType="next"
            />

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>DATE</Text>
            <TextInput
              style={[styles.input, styles.textInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={date}
              onChangeText={setDate}
              returnKeyType="next"
            />

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.textInput, styles.notesInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              placeholder="Optional note"
              placeholderTextColor={colors.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              returnKeyType="next"
            />

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TAGS</Text>
            <TextInput
              style={[styles.input, styles.textInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              placeholder="groceries, weekly (comma separated)"
              placeholderTextColor={colors.mutedForeground}
              value={tags}
              onChangeText={setTags}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Expense</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 4,
  },
  currencySymbol: {
    fontSize: 28,
    fontFamily: 'Inter_500Medium',
    marginTop: 6,
  },
  amountInput: {
    fontSize: 52,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    minWidth: 120,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  notesInput: {
    minHeight: 60,
    alignItems: 'flex-start',
    textAlignVertical: 'top',
  },
  placeholder: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  inputText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  picker: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
