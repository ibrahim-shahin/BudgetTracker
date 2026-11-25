import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useColors } from '@/hooks/useColors';
import type { HistoryEvent, EventType } from '@/types';

interface Props {
  event: HistoryEvent;
  currency: string;
}

function getEventMeta(type: EventType, colors: Record<string, string>): {
  icon: string;
  iconColor: string;
  bgColor: string;
} {
  switch (type) {
    case 'expense_added':
      return { icon: 'minus-circle', iconColor: colors.destructive, bgColor: colors.dangerLight };
    case 'expense_edited':
      return { icon: 'edit-2', iconColor: colors.warning, bgColor: colors.warningLight };
    case 'expense_deleted':
      return { icon: 'trash-2', iconColor: colors.mutedForeground, bgColor: colors.muted };
    case 'category_created':
      return { icon: 'plus-circle', iconColor: colors.success, bgColor: colors.successLight };
    case 'category_updated':
      return { icon: 'edit', iconColor: colors.primary, bgColor: colors.accent };
    case 'budget_changed':
      return { icon: 'sliders', iconColor: colors.primary, bgColor: colors.accent };
    case 'category_reset':
    case 'all_reset':
      return { icon: 'refresh-cw', iconColor: colors.warning, bgColor: colors.warningLight };
    default:
      return { icon: 'activity', iconColor: colors.mutedForeground, bgColor: colors.muted };
  }
}

export default function HistoryEventItem({ event, currency }: Props) {
  const colors = useColors();
  const meta = getEventMeta(event.type, colors as unknown as Record<string, string>);

  const formattedDate = (() => {
    try {
      return format(new Date(event.createdAt), 'MMM d, yyyy · h:mm a');
    } catch {
      return event.createdAt;
    }
  })();

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: meta.bgColor }]}>
        <Feather name={meta.icon as any} size={16} color={meta.iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.foreground }]} numberOfLines={2}>
          {event.description}
        </Text>
        {event.amount !== undefined && (
          <Text style={[styles.amount, { color: event.type === 'expense_added' ? colors.destructive : colors.mutedForeground }]}>
            {event.type === 'expense_added' ? '−' : ''}{currency} {event.amount.toFixed(2)}
          </Text>
        )}
        {event.previousValue !== undefined && event.newValue !== undefined && (
          <Text style={[styles.valueChange, { color: colors.mutedForeground }]}>
            {event.previousValue.toFixed(2)} → {event.newValue.toFixed(2)}
          </Text>
        )}
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{formattedDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
  amount: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  valueChange: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});
