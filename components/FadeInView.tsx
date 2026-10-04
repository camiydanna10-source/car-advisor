import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  /** Milliseconds to wait before starting, to stagger several blocks. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

// Soft fade + rise on mount; subtle enough not to feel invasive.
export const FadeInView: React.FC<FadeInViewProps> = ({ children, delay = 0, style }) => {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};
