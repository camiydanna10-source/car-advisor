import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { GlassCard } from './GlassCard';
import { StatusChip } from './StatusChip';
import { ServiceSuggestion } from '../services/vehicleLookup';

const PRIORITY_CHIP = {
  high: { label: 'RECOMENDADO', type: 'warning' },
  medium: { label: 'CONVIENE REVISAR', type: 'info' },
  low: { label: 'OPCIONAL', type: 'info' },
} as const;

interface SuggestionCardProps {
  suggestion: ServiceSuggestion;
  onRequest: () => void;
}

// Suggested service for a registered vehicle (shared by the vehicle setup screen and the home).
export const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onRequest }) => {
  const { service, reason, priority } = suggestion;
  return (
    <GlassCard style={styles.card}>
      <View style={styles.top}>
        <StatusChip label={PRIORITY_CHIP[priority].label} type={PRIORITY_CHIP[priority].type} />
        <Text style={styles.price}>{service.price}€</Text>
      </View>
      <Text style={styles.title}>{service.title}</Text>
      <Text style={styles.reason}>{reason}</Text>
      <View style={styles.footer}>
        <Text style={styles.time}>⏱️ {service.estimatedTime}</Text>
        <TouchableOpacity style={styles.btn} onPress={onRequest}>
          <Text style={styles.btnText}>Solicitar</Text>
          <ArrowRight size={14} color={COLORS.onPrimary} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  title: {
    color: COLORS.onSurface,
    fontSize: 15,
    fontWeight: '700',
  },
  reason: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.outlineVariant,
  },
  time: {
    color: COLORS.onSurfaceVariant,
    fontSize: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
