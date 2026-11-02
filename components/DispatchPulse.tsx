import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface DispatchPulseProps {
  /** Icon shown in the centre. */
  children: React.ReactNode;
  /** The ripples only run while something is still pending. */
  active?: boolean;
  /** Hex colour (#rrggbb). */
  color?: string;
  size?: number;
}

const RIPPLES = 3;
const PERIOD_MS = 2400;
const useNativeDriver = Platform.OS !== 'web';

// Radar-like ripples that expand from the centre while a request waits for a mechanic.
// Each ripple has its own looping value (started with a phase offset) so it runs on the native
// thread: no JS work per frame and no dependency on the screen re-rendering.
export const DispatchPulse: React.FC<DispatchPulseProps> = ({
  children,
  active = true,
  color = COLORS.tertiary,
  size = 120,
}) => {
  const [ripples] = useState(() =>
    Array.from({ length: RIPPLES }, () => {
      const value = new Animated.Value(0);
      return {
        value,
        style: {
          opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.7, 0] }),
          transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }],
        },
      };
    })
  );

  useEffect(() => {
    if (!active) {
      ripples.forEach(r => r.value.setValue(0));
      return;
    }
    const animations = ripples.map((r, index) =>
      Animated.sequence([
        Animated.delay((PERIOD_MS / RIPPLES) * index),
        Animated.loop(
          Animated.timing(r.value, {
            toValue: 1,
            duration: PERIOD_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          })
        ),
      ])
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [active, ripples]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {ripples.map((r, index) => (
        <Animated.View
          key={index}
          style={[
            styles.ripple,
            { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}33` },
            r.style,
          ]}
        />
      ))}
      <View
        style={[
          styles.core,
          { width: size * 0.42, height: size * 0.42, borderRadius: size * 0.21, backgroundColor: color },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
