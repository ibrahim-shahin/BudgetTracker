import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Share,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useBudgetStore } from '@/store/budgetStore';
import ResetModal from '@/components/ResetModal';
import { CURRENCY_OPTIONS } from '@/types';
import type { ThemeOption } from '@/types';

const THEMES: { key: ThemeOption; label: string; icon: string }[] = [
  { key: 'system', label: 'System', icon: 'monitor' },
  { key: 'light', label: 'Light', icon: 'sun' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
];

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  colors: Record<string, string> & { radius: number; isDark: boolean };
  showChevron?: boolean;
}

function SettingRow({ icon, label, value, onPress, destructive, colors, showChevron = true }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: destructive ? colors.dangerLight : colors.muted }]}>
        <Feather name={icon as any} size={16} color={destructive ? colors.destructive : colors.mutedForeground} />
      </View>
      <Text style={[styles.settingLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={styles.settingRight}>
        {value ? <Text style={[styles.settingValue, { color: colors.mutedForeground }]}>{value}</Text> : null}
        {showChevron && onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function Settings() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const theme = useBudgetStore(s => s.theme);
  const currency = useBudgetStore(s => s.currency);
  const setTheme = useBudgetStore(s => s.setTheme);
  const setCurrency = useBudgetStore(s => s.setCurrency);
  const exportData = useBudgetStore(s => s.exportData);
  const importData = useBudgetStore(s => s.importData);
  const categories = useBudgetStore(s => s.categories);
  const expenses = useBudgetStore(s => s.expenses);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [showResetAll, setShowResetAll] = useState(false);

  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const handleExport = async () => {
    const json = exportData();
    if (Platform.OS === 'web') {
      Alert.alert('Export Data', 'Copy the JSON from the console (web export).\n\n' + json.substring(0, 200) + '...');
      return;
    }
    try {
      await Share.share({ message: json, title: 'Budget Data Export' });
    } catch {
      Alert.alert('Export failed', 'Could not export data');
    }
  };

  const handleExportCSV = () => {
    const headers = 'Category,Amount,Merchant,Notes,Tags,Date\n';
    const rows = expenses
      .map(e => {
        const cat = categories.find(c => c.id === e.categoryId);
        return `"${cat?.name ?? ''}",${e.amount},"${e.merchant}","${e.notes}","${e.tags.join(';')}",${e.date}`;
      })
      .join('\n');
    const csv = headers + rows;
    if (Platform.OS === 'web') {
      Alert.alert('Export CSV', 'CSV data ready.\n\n' + csv.substring(0, 200));
      return;
    }
    Share.share({ message: csv, title: 'Budget Expenses CSV' }).catch(() => {
      Alert.alert('Export failed', 'Could not export CSV');
    });
  };

  const handleImport = () => {
    const success = importData(importText.trim());
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowImportModal(false);
      setImportText('');
      Alert.alert('Import Successful', 'Your data has been imported.');
    } else {
      Alert.alert('Import Failed', 'Invalid data format. Please paste valid JSON exported from this app.');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all categories, expenses, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            useBudgetStore.setState({ categories: [], expenses: [], events: [] });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.themeRow}>
            {THEMES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: theme === t.key ? colors.primary : colors.muted,
                    borderColor: theme === t.key ? colors.primary : 'transparent',
                  },
                ]}
                onPress={() => { Haptics.selectionAsync(); setTheme(t.key); }}
              >
                <Feather
                  name={t.icon as any}
                  size={16}
                  color={theme === t.key ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    { color: theme === t.key ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CURRENCY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="dollar-sign"
            label="Currency"
            value={currency}
            onPress={() => setShowCurrencyPicker(true)}
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DATA</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="download"
            label="Export as JSON"
            onPress={handleExport}
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
          />
          <SettingRow
            icon="file-text"
            label="Export as CSV"
            onPress={handleExportCSV}
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
          />
          <SettingRow
            icon="upload"
            label="Import JSON"
            onPress={() => setShowImportModal(true)}
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
            showChevron={false}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CYCLES</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="refresh-cw"
            label="Reset All Categories"
            onPress={() => setShowResetAll(true)}
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="trash-2"
            label="Clear All Data"
            onPress={handleClearAll}
            destructive
            colors={colors as unknown as Record<string, string> & { radius: number; isDark: boolean }}
          />
        </View>

        <View style={[styles.appInfo, { borderColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.foreground }]}>Budget Tracker</Text>
          <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>
            {categories.length} categories · {expenses.length} expenses
          </Text>
        </View>
      </ScrollView>

      <Modal visible={showCurrencyPicker} animationType="slide" transparent onRequestClose={() => setShowCurrencyPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Select Currency</Text>
            <ScrollView>
              {CURRENCY_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pickerItem, { borderBottomColor: colors.border }, c === currency && { backgroundColor: colors.accent }]}
                  onPress={() => { Haptics.selectionAsync(); setCurrency(c); setShowCurrencyPicker(false); }}
                >
                  <Text style={[styles.pickerItemText, { color: colors.foreground }]}>{c}</Text>
                  {c === currency && <Feather name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showImportModal} animationType="slide" transparent onRequestClose={() => setShowImportModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowImportModal(false)}>
          <Pressable>
            <View style={[styles.importSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Import JSON</Text>
              <Text style={[styles.importHint, { color: colors.mutedForeground }]}>
                Paste the JSON data exported from this app.
              </Text>
              <TextInput
                style={[styles.importInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                multiline
                numberOfLines={8}
                placeholder='{"version": 1, "categories": [...], ...}'
                placeholderTextColor={colors.mutedForeground}
                value={importText}
                onChangeText={setImportText}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.importBtn, { backgroundColor: colors.primary }]}
                onPress={handleImport}
                activeOpacity={0.85}
              >
                <Text style={[styles.importBtnText, { color: colors.primaryForeground }]}>Import Data</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ResetModal
        visible={showResetAll}
        onClose={() => setShowResetAll(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  themeLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 24,
  },
  appName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  appVersion: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: 480,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
  },
  pickerItemText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  importSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingTop: 12,
  },
  importHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  importInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    height: 160,
    marginBottom: 16,
  },
  importBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  importBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
