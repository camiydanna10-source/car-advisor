import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface StatusChipProps {
  label: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}

export const StatusChip: React.FC<StatusChipProps> = ({ label, type = 'success' }) => {
  let bg = 'rgba(16, 185, 129, 0.15)';
  let border = COLORS.success;
  let text = COLORS.success;

  if (type === 'warning') {
    bg = 'rgba(236, 106, 6, 0.15)';
    border = COLORS.tertiary;
    text = COLORS.tertiary;
  } else if (type === 'error') {
    bg = 'rgba(255, 180, 171, 0.15)';
    border = COLORS.error;
    text = COLORS.error;
  } else if (type === 'info') {
    bg = 'rgba(107, 216, 203, 0.15)';
    border = COLORS.primary;
    text = COLORS.primary;
  }

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
