import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { selectBudgetData, useBudgetStore } from '@/store/budgetStore';
import type { BudgetData } from '@/types';
import { createBackup, readBackup } from '@/utils/backup';
import { confirm, notify } from '@/utils/confirm';
import { expensesCsv } from '@/utils/exportCsv';
import { canPickFiles, pickTextFile, shareFile } from '@/utils/files';
import { successFeedback, warningFeedback } from '@/utils/haptics';
import { countOf } from '@/utils/text';
import { today } from '@/utils/dates';

function Action({ icon, title, detail, onPress, testID, busy }: { icon: 'save' | 'file-text' | 'upload'; title: string; detail: string; onPress: () => void; testID: string; busy?: boolean }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.8}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
        {busy ? <ActivityIndicator color={colors.primary} /> : <Feather name={icon} size={18} color={colors.accentForeground} />}
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.actionDetail, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BackupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const lastBackupAt = useBudgetStore(s => s.lastBackupAt);
  const expenseCount = useBudgetStore(s => s.expenses.length);
  const markBackedUp = useBudgetStore(s => s.markBackedUp);
  const replaceData = useBudgetStore(s => s.replaceData);
  const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState<'backup' | 'csv' | 'file' | null>(null);

  const saveBackup = async () => {
    setBusy('backup');
    try {
      const data = selectBudgetData(useBudgetStore.getState());
      await shareFile(`budget-tracker-backup-${today()}.json`, JSON.stringify(createBackup(data), null, 2), 'application/json', 'Save your Budget Tracker backup');
      // The share sheet closes the same way whether or not the file went
      // anywhere, so ask before recording the backup.
      const saved = await confirm('Did you save the backup?', 'Only say yes if the file went somewhere safe, like Drive or Files.', 'Yes, saved');
      if (saved) {
        markBackedUp();
        successFeedback();
      }
    } catch {
      notify("Couldn't save the backup", 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setBusy('csv');
    try {
      const { expenses, categories, currency } = useBudgetStore.getState();
      await shareFile(`budget-tracker-expenses-${today()}.csv`, expensesCsv(expenses, categories, currency), 'text/csv', 'Export expenses');
    } catch {
      notify("Couldn't export", 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async (text: string): Promise<boolean> => {
    const result = readBackup(text.trim());
    if (!result.ok) {
      warningFeedback();
      notify("Can't restore this", result.error);
      return false;
    }
    const { categories, expenses } = useBudgetStore.getState();
    const incoming: BudgetData = result.data;
    const ok = await confirm(
      'Replace your data?',
      `The backup has ${countOf(incoming.categories.length, 'category', 'categories')} and ${countOf(incoming.expenses.length, 'expense', 'expenses')}. ` +
        `They replace the ${countOf(categories.length, 'category', 'categories')} and ${countOf(expenses.length, 'expense', 'expenses')} on this phone.`,
      'Replace',
      true,
    );
    if (!ok) return false;
    replaceData(incoming);
    successFeedback();
    notify('Restored', result.legacy ? 'Your data from the first version of the app is back.' : 'Your backup is back.');
    return true;
  };

  const restoreFromFile = async () => {
    setBusy('file');
    try {
      const text = await pickTextFile();
      if (text !== null) await restore(text);
    } catch (error) {
      notify("Couldn't open the file", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Backup and restore</Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]} bottomOffset={24}>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Your data is only on this phone. Save a backup file now and then, to Files or Drive, so you can restore it on a new phone.
        </Text>
        <Text testID="last-backup" style={[styles.status, { color: lastBackupAt ? colors.success : colors.warning }]}>
          {lastBackupAt ? `Last backup: ${new Date(lastBackupAt).toLocaleString()}` : 'No backup saved yet'}
        </Text>

        <Action testID="save-backup" icon="save" title="Save a backup file" detail="Everything, as a JSON file you can restore" onPress={() => void saveBackup()} busy={busy === 'backup'} />
        <Action
          testID="export-csv"
          icon="file-text"
          title="Export expenses as CSV"
          detail={`${countOf(expenseCount, 'expense', 'expenses')}, for Excel or Google Sheets`}
          onPress={() => void exportCsv()}
          busy={busy === 'csv'}
        />
        {canPickFiles ? (
          <Action testID="restore-file" icon="upload" title="Restore from a backup file" detail="Replaces the data on this phone" onPress={() => void restoreFromFile()} busy={busy === 'file'} />
        ) : null}

        <Text style={[styles.label, { color: colors.mutedForeground }]}>OR PASTE A BACKUP</Text>
        <TextInput
          testID="paste-input"
          style={[styles.paste, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
          multiline
          placeholder='{"app": "budget-tracker", ...}'
          placeholderTextColor={colors.mutedForeground}
          value={pasted}
          onChangeText={setPasted}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />
        <TouchableOpacity
          testID="restore-pasted"
          accessibilityRole="button"
          disabled={pasted.trim() === ''}
          style={[styles.restoreBtn, { backgroundColor: colors.primary, opacity: pasted.trim() === '' ? 0.5 : 1 }]}
          onPress={async () => {
            if (await restore(pasted)) setPasted('');
          }}
        >
          <Text style={[styles.restoreText, { color: colors.primaryForeground }]}>Restore pasted backup</Text>
        </TouchableOpacity>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>Exports from the first version of the app work too.</Text>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  body: { padding: 16, gap: 12 },
  intro: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  status: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  actionDetail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginTop: 12 },
  paste: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120, fontSize: 13, fontFamily: 'Inter_400Regular' },
  restoreBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  restoreText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
