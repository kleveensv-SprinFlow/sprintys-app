import { useColorScheme as useDeviceColorScheme } from 'react-native';

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
};

const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

const typography = {
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
  },
};

const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
};

// GLOBAL GLASSMORPHISM NEON THEME
export const universalColors = {
  background: 'transparent', // Let the global LinearGradient shine through
  surface: 'rgba(255, 255, 255, 0.07)', // Glass cards
  surfaceLight: 'rgba(255, 255, 255, 0.12)', 
  accent: '#00DCFD', // Cyan
  accentSecondary: '#0069E8', // Blue
  accentMuted: 'rgba(0, 220, 253, 0.15)',
  text: '#FFFFFF', // Pure white text for readability
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  border: 'rgba(255, 255, 255, 0.12)', // Subtle glass borders
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  glow: 'rgba(0, 220, 253, 0.3)',
};

export const useTheme = () => {
  return {
    colors: universalColors,
    spacing,
    radius,
    typography,
    glass,
    isDark: true // Always true now
  };
};

export const theme = {
  colors: universalColors,
  spacing,
  radius,
  typography,
  glass,
};