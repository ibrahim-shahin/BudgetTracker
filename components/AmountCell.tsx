import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { currencyDecimals, formatAmount } from '@/utils/money';

interface Props {
  label: string;
  /** Minor units; null shows a dash. */
  minor: number | null;
  currency: string;
  color?: string;
  testID?: string;
}

/** The type size that keeps an amount on one line in a third of a phone screen. */
export function amountFontSize(text: string): number {
  if (text.length <= 9) return 16;
  if (text.length <= 10) return 15;
  if (text.length <= 11) return 14;
  return 13;
}

/**
 * One of the three amounts in a summary row. The currency sits on its own
 * small line, and long amounts get smaller type instead of being cut off.
 */
export default function AmountCell({ label, minor, currency, color, testID }: Props) {
  const colors = useColors();
  const text = minor === null ? '—' : formatAmount(Math.abs(minor), currencyDecimals(currency));
  return (
    <View style={styles.cell} testID={testID} accessible accessibilityLabel={`${label}: ${minor === null ? 'none' : `${currency} ${text}`}`}>
      <Text style={[styles.currency, { color: colors.mutedForeground }]}>{minor === null ? ' ' : currency}</Text>
      <Text style={[styles.value, { color: color ?? colors.foreground, fontSize: amountFontSize(text) }]} numberOfLines={1}>
        {text}
      </Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingHorizontal: 2, minWidth: 0 },
  currency: { fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  value: { fontFamily: 'Inter_700Bold', marginVertical: 1 },
  label: { fontSize: 11, fontFamily: 'Inter_400Regular', textTransform: 'uppercase', letterSpacing: 0.5 },
});
