import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import type { ThemeOption } from '@/types';
import { changeCurrency } from '@/utils/budget';
import { confirm, notify } from '@/utils/confirm';
import { tapFeedback, warningFeedback } from '@/utils/haptics';
import { CURRENCIES } from '@/utils/money';

const THEMES: { key: ThemeOption; label: string; icon: 'monitor' | 'sun' | 'moon' }[] = [
  { key: 'system', label: 'System', icon: 'monitor' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
}

interface RowProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  testID?: string;
}

function SettingRow({ icon, label, value, onPress, destructive, testID }: RowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: destructive ? colors.dangerLight : colors.muted }]}>
        <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.mutedForeground} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
      {onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const theme = useBudgetStore(s => s.theme);
  const currency = useBudgetStore(s => s.currency);
  const startDay = useBudgetStore(s => s.periodStartDay);
  const recurringCount = useBudgetStore(s => s.recurring.length);
  const categoryCount = useBudgetStore(s => s.categories.length);
  const expenseCount = useBudgetStore(s => s.expenses.length);
  const lastBackupAt = useBudgetStore(s => s.lastBackupAt);
  const setTheme = useBudgetStore(s => s.setTheme);
  const setCurrency = useBudgetStore(s => s.setCurrency);
  const setPeriodStartDay = useBudgetStore(s => s.setPeriodStartDay);
  const clearData = useBudgetStore(s => s.clearData);
  const [showCurrencies, setShowCurrencies] = useState(false);

  const chooseCurrency = async (code: string) => {
    setShowCurrencies(false);
    if (code === currency) return;
    const state = useBudgetStore.getState();
    const hasAmounts = state.expenses.length > 0 || state.categories.length > 0;
    if (hasAmounts) {
      const { inexact } = changeCurrency(state, code);
      const ok = await confirm(
        `Switch to ${code}?`,
        `Amounts keep their numbers: 12.5 ${currency} becomes 12.5 ${code}. Nothing is converted at an exchange rate.` +
          (inexact > 0 ? `\n\n${inexact} amount${inexact === 1 ? ' has' : 's have'} more decimals than ${code} uses and will be rounded.` : ''),
        'Switch',
      );
      if (!ok) return;
    }
    tapFeedback();
    setCurrency(code);
  };

  const clearAll = async () => {
    const ok = await confirm(
      'Delete all data?',
      `This deletes ${categoryCount} categories and ${expenseCount} expenses from this phone. Save a backup first if you might want them. This can't be undone.`,
      'Delete everything',
      true,
    );
    if (!ok) return;
    warningFeedback();
    clearData();
    notify('Deleted', 'All categories and expenses are gone.');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.section, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.card, styles.themeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {THEMES.map(t => {
            const selected = theme === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                testID={`theme-${t.key}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.themeOption, { backgroundColor: selected ? colors.primary : colors.muted }]}
                onPress={() => {
                  tapFeedback();
                  setTheme(t.key);
                }}
              >
                <Feather name={t.icon} size={16} color={selected ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[styles.themeLabel, { color: selected ? colors.primaryForeground : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>BUDGET</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow testID="currency-row" icon="dollar-sign" label="Currency" value={currency} onPress={() => setShowCurrencies(true)} />
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
              <Feather name="calendar" size={16} color={colors.mutedForeground} />
            </View>
            <View style={styles.stepperText}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Months start on the</Text>
              <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>Pick your payday to budget pay to pay</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                testID="start-day-down"
                accessibilityRole="button"
                accessibilityLabel="Earlier start day"
                disabled={startDay <= 1}
                onPress={() => setPeriodStartDay(startDay - 1)}
                style={[styles.stepButton, { backgroundColor: colors.muted, opacity: startDay <= 1 ? 0.4 : 1 }]}
              >
                <Feather name="minus" size={14} color={colors.foreground} />
              </TouchableOpacity>
              <Text testID="start-day" style={[styles.stepValue, { color: colors.foreground }]}>
                {ordinal(startDay)}
              </Text>
              <TouchableOpacity
                testID="start-day-up"
                accessibilityRole="button"
                accessibilityLabel="Later start day"
                disabled={startDay >= 31}
                onPress={() => setPeriodStartDay(startDay + 1)}
                style={[styles.stepButton, { backgroundColor: colors.muted, opacity: startDay >= 31 ? 0.4 : 1 }]}
              >
                <Feather name="plus" size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
          <SettingRow
            testID="recurring-row"
            icon="repeat"
            label="Recurring expenses"
            value={recurringCount > 0 ? String(recurringCount) : undefined}
            onPress={() => router.push('/recurring')}
          />
        </View>
        {startDay > 28 ? (
          <Text style={[styles.note, { color: colors.mutedForeground }]}>In shorter months the month starts on their last day.</Text>
        ) : null}

        <Text style={[styles.section, { color: colors.mutedForeground }]}>DATA</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            testID="backup-row"
            icon="save"
            label="Backup, restore and export"
            value={lastBackupAt ? `Saved ${new Date(lastBackupAt).toLocaleDateString()}` : 'No backup yet'}
            onPress={() => router.push('/backup')}
          />
          <SettingRow testID="clear-all" icon="trash-2" label="Delete all data" destructive onPress={() => void clearAll()} />
        </View>

        <View style={styles.about}>
          <Text style={[styles.appName, { color: colors.foreground }]}>Budget Tracker {Constants.expoConfig?.version ?? ''}</Text>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            {categoryCount} categories · {expenseCount} expenses
          </Text>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            Everything stays on this phone. There is no account, and the app sends nothing anywhere.
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showCurrencies} animationType="fade" transparent onRequestClose={() => setShowCurrencies(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCurrencies(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Currency</Text>
            <ScrollView>
              {CURRENCIES.map(c => (
                <TouchableOpacity
                  key={c.code}
                  testID={`currency-${c.code}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: c.code === currency }}
                  style={[styles.sheetItem, { borderBottomColor: colors.border }, c.code === currency && { backgroundColor: colors.accent }]}
                  onPress={() => void chooseCurrency(c.code)}
                >
                  <View>
                    <Text style={[styles.sheetCode, { color: colors.foreground }]}>{c.code}</Text>
                    <Text style={[styles.sheetName, { color: colors.mutedForeground }]}>
                      {c.name} · {c.decimals} decimals
                    </Text>
                  </View>
                  {c.code === currency ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  content: { padding: 16 },
  section: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  themeRow: { flexDirection: 'row', gap: 8, padding: 8 },
  themeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  themeLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  rowValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  stepperText: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, textAlign: 'center', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6, marginHorizontal: 4 },
  about: { alignItems: 'center', marginTop: 32, gap: 6, paddingHorizontal: 16 },
  appName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  aboutText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, maxHeight: '80%', paddingTop: 16, overflow: 'hidden' },
  sheetTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 16, paddingBottom: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetCode: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  sheetName: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
