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

// GLOBAL TIMELESS LIGHT THEME
export const universalColors = {
  background: 'transparent',
  surface: '#FFFFFF', // Pure white cards
  surfaceLight: '#F5F2EB', // Light slate for inputs/rows
  accent: '#1C1917', // Dark Slate/Black for premium active elements
  accentSecondary: '#57534E',
  accentMuted: 'rgba(28, 25, 23, 0.05)',
  text: '#1C1917',
  textSecondary: '#78716C',
  textMuted: '#A8A29E',
  border: '#E0DCD3', // Subtle light border
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  glow: 'rgba(0, 0, 0, 0.05)',
};

export const useTheme = () => {
  return {
    colors: universalColors,
    spacing,
    radius,
    typography,
    glass,
    isDark: false
  };
};

export const theme = {
  colors: universalColors,
  spacing,
  radius,
  typography,
  glass,
};
