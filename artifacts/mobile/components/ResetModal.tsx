import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import type { Category } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  category?: Category;
}

export default function ResetModal({ visible, onClose, category }: Props) {
  const colors = useColors();
  const [keepBudget, setKeepBudget] = useState(true);
  const resetCategory = useBudgetStore(s => s.resetCategory);
  const resetAll = useBudgetStore(s => s.resetAll);

  const isResetAll = !category;
  const title = isResetAll ? 'Reset All Categories' : `Reset "${category?.name}"`;

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isResetAll) {
      resetAll(keepBudget);
    } else if (category) {
      resetCategory(category.id, keepBudget);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable>
          <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.warningLight }]}>
              <Feather name="refresh-cw" size={28} color={colors.warning} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {isResetAll
                ? 'This will start a new spending cycle for all categories. All previous expenses remain in history.'
                : `This will start a new spending cycle for "${category?.name}". All previous expenses remain in history.`}
            </Text>

            <View style={[styles.option, { borderColor: colors.border }]}>
              <View style={styles.optionLabel}>
                <Text style={[styles.optionTitle, { color: colors.foreground }]}>Keep budget amounts</Text>
                <Text style={[styles.optionSub, { color: colors.mutedForeground }]}>
                  Budget values carry over to the new cycle
                </Text>
              </View>
              <Switch
                value={keepBudget}
                onValueChange={setKeepBudget}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.primaryForeground}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.resetBtn, { backgroundColor: colors.warning }]}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Feather name="refresh-cw" size={16} color="#fff" />
                <Text style={[styles.btnText, { color: '#fff' }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  option: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 12,
  },
  optionLabel: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  optionSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    borderWidth: 1,
  },
  resetBtn: {},
  btnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
