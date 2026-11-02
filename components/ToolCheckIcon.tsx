import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, Wrench } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

interface ToolCheckIconProps {
  size?: number;
  color?: string;
}

// Wrench with a check badge: "a mechanic has taken the job". Takes the same props as the
// lucide icons so it can be used wherever one is expected.
export const ToolCheckIcon: React.FC<ToolCheckIconProps> = ({ size = 24, color = '#FFF' }) => {
  const badge = size * 0.6;
  return (
    <View style={{ width: size, height: size }}>
      <Wrench size={size} color={color} />
      <View
        style={[
          styles.badge,
          { width: badge, height: badge, borderRadius: badge / 2, right: -badge * 0.3, bottom: -badge * 0.3 },
        ]}
      >
        <Check size={badge * 0.7} color={COLORS.primaryContainer} strokeWidth={3.5} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
