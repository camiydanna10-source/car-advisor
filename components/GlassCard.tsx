import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'normal' | 'high' | 'lowest' | 'primaryGlow' | 'alertGlow';
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, variant = 'normal' }) => {
  let backgroundColor = COLORS.surfaceContainer;
  let borderColor = COLORS.outlineVariant;
  let shadow = SHADOWS.neumorphic;

  if (variant === 'high') {
    backgroundColor = COLORS.surfaceContainerHigh;
  } else if (variant === 'lowest') {
    backgroundColor = COLORS.surfaceContainerLowest;
  } else if (variant === 'primaryGlow') {
    backgroundColor = COLORS.surfaceContainer;
    borderColor = COLORS.primary;
    shadow = SHADOWS.glass;
  } else if (variant === 'alertGlow') {
    backgroundColor = COLORS.surfaceContainer;
    borderColor = COLORS.tertiary;
    shadow = SHADOWS.sos;
  }

  return (
    <View style={[styles.card, { backgroundColor, borderColor }, shadow, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
});
