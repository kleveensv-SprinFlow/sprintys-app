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
  background: '#F8FAFC', // Crisp modern light background
  surface: '#FFFFFF', // Pure white cards
  surfaceLight: '#F1F5F9', // Light slate for inputs/rows
  accent: '#0F172A', // Dark Slate/Black for premium active elements
  accentSecondary: '#475569',
  accentMuted: 'rgba(15, 23, 42, 0.05)',
  sprintyBlue: '#0069E8', // Signature electric blue from logo
  sprintyCyan: '#00DCFD', // Signature electric cyan from logo
  sprintyMuted: 'rgba(0, 105, 232, 0.08)', // Subtle translucent tint for active pills
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0', // Subtle light border
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  glow: 'rgba(0, 0, 0, 0.05)',
};

export const useTheme = () => {
  return {
    shadows: theme.shadows,
    colors: universalColors,
    spacing,
    radius,
    typography,
    glass,
    isDark: false
  };
};

export const theme = {
  shadows: {
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 14,
      elevation: 2,
    }
  },
  colors: universalColors,
  spacing,
  radius,
  typography,
  glass,
};
