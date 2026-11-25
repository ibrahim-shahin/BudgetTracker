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
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/types';
import type { Category } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  editingCategory?: Category;
}

export default function AddCategoryModal({ visible, onClose, editingCategory }: Props) {
  const colors = useColors();
  const addCategory = useBudgetStore(s => s.addCategory);
  const updateCategory = useBudgetStore(s => s.updateCategory);
  const currency = useBudgetStore(s => s.currency);

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[5]);
  const [selectedIcon, setSelectedIcon] = useState(CATEGORY_ICONS[0]);
  const [nameError, setNameError] = useState('');
  const [budgetError, setBudgetError] = useState('');

  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        setName(editingCategory.name);
        setBudget(editingCategory.budget.toString());
        setSelectedColor(editingCategory.color);
        setSelectedIcon(editingCategory.icon);
      } else {
        setName('');
        setBudget('');
        setSelectedColor(CATEGORY_COLORS[5]);
        setSelectedIcon(CATEGORY_ICONS[0]);
      }
      setNameError('');
      setBudgetError('');
    }
  }, [visible, editingCategory]);

  const handleSave = () => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Category name is required');
      valid = false;
    }
    const parsedBudget = parseFloat(budget);
    if (!budget || isNaN(parsedBudget) || parsedBudget <= 0) {
      setBudgetError('Enter a valid budget amount');
      valid = false;
    }
    if (!valid) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: name.trim(),
        budget: parsedBudget,
        color: selectedColor,
        icon: selectedIcon,
      });
    } else {
      addCategory(name.trim(), parsedBudget, selectedColor, selectedIcon);
    }
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
            <Text style={[styles.title, { color: colors.foreground }]}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.previewRow}>
              <View style={[styles.previewIcon, { backgroundColor: selectedColor + '22' }]}>
                <Feather name={selectedIcon as any} size={28} color={selectedColor} />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>CATEGORY NAME</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: nameError ? colors.destructive : colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={v => { setName(v); setNameError(''); }}
              autoFocus
              returnKeyType="next"
            />
            {nameError ? <Text style={[styles.error, { color: colors.destructive }]}>{nameError}</Text> : null}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>BUDGET ({currency})</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: budgetError ? colors.destructive : colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={budget}
              onChangeText={v => { setBudget(v); setBudgetError(''); }}
              returnKeyType="done"
            />
            {budgetError ? <Text style={[styles.error, { color: colors.destructive }]}>{budgetError}</Text> : null}

            <Text style={[styles.label, { color: colors.mutedForeground }]}>COLOR</Text>
            <View style={styles.colorGrid}>
              {CATEGORY_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedColor(color); }}
                >
                  {selectedColor === color && (
                    <Feather name="check" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>ICON</Text>
            <View style={styles.iconGrid}>
              {CATEGORY_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: selectedIcon === icon ? selectedColor + '22' : colors.muted,
                      borderColor: selectedIcon === icon ? selectedColor : 'transparent',
                    },
                  ]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedIcon(icon); }}
                >
                  <Feather
                    name={icon as any}
                    size={20}
                    color={selectedIcon === icon ? selectedColor : colors.mutedForeground}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: selectedColor }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Text>
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
  previewRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  error: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconOption: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
    color: '#fff',
  },
});
