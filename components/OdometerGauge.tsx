import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS, TYPE } from '../constants/theme';

const ARC = 'M 20 100 A 80 80 0 0 1 180 100';
const ARC_LENGTH = Math.PI * 80;
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface OdometerGaugeProps {
  km: number;
  /** Odometer value at which the arc is full (purely visual scale). */
  maxKm?: number;
  caption?: string;
}

// Semicircular odometer from the dashboard prototype: segmented track, glowing animated arc
// and the total mileage in the centre. It shows the real odometer reading only.
export const OdometerGauge: React.FC<OdometerGaugeProps> = ({ km, maxKm = 200000, caption }) => {
  const ratio = Math.min(Math.max(km / maxKm, 0.02), 1);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, ratio]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [ARC_LENGTH, 0] });

  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height="100%" viewBox="0 0 200 110">
        <Defs>
          <LinearGradient id="odoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#29A195" />
            <Stop offset="70%" stopColor="#6BD8CB" />
            <Stop offset="100%" stopColor="#89F5E7" />
          </LinearGradient>
        </Defs>
        <Path d={ARC} fill="none" stroke={COLORS.surfaceContainerHigh} strokeWidth={12} strokeLinecap="round" />
        <Path d={ARC} fill="none" stroke={COLORS.surfaceContainer} strokeWidth={14} strokeDasharray="2 10" />
        <AnimatedPath
          d={ARC}
          fill="none"
          stroke="#6BD8CB"
          strokeOpacity={0.22}
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={dashOffset}
        />
        <AnimatedPath
          d={ARC}
          fill="none"
          stroke="url(#odoGradient)"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={dashOffset}
        />
      </Svg>

      <View style={styles.center}>
        <Text style={styles.label}>RECORRIDO TOTAL</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{km.toLocaleString('es-ES')}</Text>
          <Text style={styles.unit}>KM</Text>
        </View>
        {caption ? (
          <View style={styles.captionRow}>
            <View style={styles.captionDot} />
            <Text style={styles.caption} numberOfLines={1}>{caption}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 200 / 110,
    alignSelf: 'center',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
    alignItems: 'center',
  },
  label: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    ...TYPE.telemetryNum,
    color: COLORS.onSurface,
  },
  unit: {
    ...TYPE.labelMd,
    color: COLORS.primary,
    fontWeight: '700',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    maxWidth: '90%',
  },
  captionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  caption: {
    ...TYPE.bodySm,
    color: COLORS.onSurfaceVariant,
  },
});
