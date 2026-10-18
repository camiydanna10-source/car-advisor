import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { COLORS, RADIUS, TYPE } from '../constants/theme';

interface PhoneFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  hint?: string;
  error?: string;
}

// Phone input shared by the sign-up, the service request, the SOS and the profile.
export const PhoneField: React.FC<PhoneFieldProps> = ({
  value,
  onChangeText,
  label = 'Teléfono móvil',
  hint,
  error,
}) => (
  <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.wrapper, !!error && styles.wrapperError]}>
      <Phone size={18} color={COLORS.onSurfaceVariant} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="600 123 456"
        placeholderTextColor={COLORS.outline}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={18}
        accessibilityLabel={label}
      />
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  label: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: RADIUS.DEFAULT,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  wrapperError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    color: COLORS.onSurface,
    fontSize: 15,
  },
  error: {
    color: COLORS.error,
    fontSize: 12,
  },
  hint: {
    color: COLORS.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 15,
  },
});
