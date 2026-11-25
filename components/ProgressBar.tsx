import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  progress: number;
  color?: string;
  height?: number;
  showOverspent?: boolean;
}

export default function ProgressBar({ progress, color, height = 6, showOverspent = true }: Props) {
  const colors = useColors();
  const clampedProgress = Math.min(progress, 1);
  const isOverspent = progress > 1;

  const barColor = color ?? (isOverspent && showOverspent ? colors.destructive : colors.primary);
  const trackColor = colors.isDark ? colors.border : '#E8EEF4';

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: barColor,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
