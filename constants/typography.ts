import { TextStyle } from 'react-native';

// Kinetic Glass typographic scale — DESIGN.md `typography:` block.
// Montserrat drives display/headline/telemetry, Inter drives body/label copy.
type TypeToken = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight'>;

export const TYPE: Record<string, TypeToken> = {
  displayLg: { fontFamily: 'Montserrat_700Bold', fontSize: 36, fontWeight: '700', lineHeight: 44 },
  displayLgMobile: { fontFamily: 'Montserrat_700Bold', fontSize: 30, fontWeight: '700', lineHeight: 38 },
  headlineLg: { fontFamily: 'Montserrat_600SemiBold', fontSize: 24, fontWeight: '600', lineHeight: 32 },
  headlineMd: { fontFamily: 'Montserrat_600SemiBold', fontSize: 20, fontWeight: '600', lineHeight: 28 },
  headlineSm: { fontFamily: 'Montserrat_600SemiBold', fontSize: 18, fontWeight: '600', lineHeight: 24 },
  bodyLg: { fontFamily: 'Inter_400Regular', fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd: { fontFamily: 'Inter_400Regular', fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm: { fontFamily: 'Inter_400Regular', fontSize: 12, fontWeight: '400', lineHeight: 16 },
  labelLg: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  labelMd: { fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '600', lineHeight: 16 },
  labelSm: { fontFamily: 'Inter_500Medium', fontSize: 10, fontWeight: '500', lineHeight: 14 },
  telemetryNum: { fontFamily: 'Montserrat_700Bold', fontSize: 32, fontWeight: '700', lineHeight: 36 },
};

// Fonts that must be loaded via useFonts() before any TYPE token can render correctly.
export const FONT_WEIGHTS_USED = [
  'Montserrat_600SemiBold',
  'Montserrat_700Bold',
  'Inter_400Regular',
  'Inter_500Medium',
  'Inter_600SemiBold',
] as const;
