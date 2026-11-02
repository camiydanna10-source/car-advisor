import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { RADIUS } from '../constants/theme';

interface PlateInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
}

// Spanish licence plate widget (EU band + plate number input).
export const PlateInput: React.FC<PlateInputProps> = ({ value, onChangeText, onSubmitEditing }) => (
  <View style={styles.plateWidget}>
    <View style={styles.plateEuBand}>
      <Text style={styles.plateEuStars}>★★</Text>
      <Text style={styles.plateEuLetter}>E</Text>
    </View>
    <TextInput
      style={styles.plateInput}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      placeholder="0000 XXX"
      placeholderTextColor="rgba(18,18,18,0.4)"
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={8}
      returnKeyType="search"
      accessibilityLabel="Matrícula del vehículo"
    />
  </View>
);

const styles = StyleSheet.create({
  plateWidget: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.DEFAULT,
    borderWidth: 2,
    borderColor: '#D0D4DC',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  plateEuBand: {
    width: 32,
    backgroundColor: '#003399',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  plateEuStars: {
    color: '#FFCC00',
    fontSize: 8,
    fontWeight: '700',
  },
  plateEuLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  plateInput: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    letterSpacing: 3,
    color: '#121212',
  },
});
