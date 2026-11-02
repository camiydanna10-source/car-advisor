// Kinetic Glass Design System Tokens
export const COLORS = {
  // Base Surface (Cockpit Obsidian Bedrock)
  background: '#101415',
  surface: '#101415',
  surfaceDim: '#101415',
  surfaceBright: '#363A3B',
  surfaceContainerLowest: '#0B0F10',
  surfaceContainerLow: '#191C1E',
  surfaceContainer: '#1D2022',
  surfaceContainerHigh: '#272A2C',
  surfaceContainerHighest: '#323537',

  // Text / Content Colors
  onSurface: '#E0E3E5',
  onSurfaceVariant: '#BCC9C6',
  outline: '#879391',
  outlineVariant: '#3D4947',

  // Primary Brand (Kinetic Teal)
  primary: '#6BD8CB',
  primaryDark: '#0D9488',
  onPrimary: '#003732',
  primaryContainer: '#29A195',
  onPrimaryContainer: '#00302B',
  surfaceTint: '#6BD8CB',

  // Secondary (Slate Blue)
  secondary: '#BEC6E0',
  onSecondary: '#283044',
  secondaryContainer: '#3F465C',
  onSecondaryContainer: '#ADB4CE',

  // Tertiary (Alert Amber / Mechanical Orange)
  tertiary: '#FFB690',
  onTertiary: '#552100',
  tertiaryContainer: '#EC6A06',
  onTertiaryContainer: '#4A1C00',

  // Status Colors
  success: '#10B981',
  onSuccess: '#003822',
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
};

export const SHADOWS = {
  neumorphic: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  glass: {
    shadowColor: '#6BD8CB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  sos: {
    shadowColor: '#EC6A06',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
};
