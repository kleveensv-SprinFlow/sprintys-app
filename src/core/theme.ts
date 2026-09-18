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

// Lighter, colorful theme matching the Sprinty logo (Blue/Cyan gradient)
export const lightColors = {
  background: '#F7F9FC', // Very soft cool grey/blue background
  surface: '#FFFFFF',    // Pure white for cards
  surfaceLight: '#F0F4F8', // Slightly darker for secondary areas
  accent: '#0069E8',     // Main Sprintflow Blue from the logo
  accentSecondary: '#00DCFD', // Cyan from the logo
  accentMuted: 'rgba(0, 105, 232, 0.1)', // Very transparent blue
  text: '#111827',       // Very dark blue/grey
  textSecondary: '#64748B', 
  textMuted: '#94A3B8',
  border: '#E2E8F0',     // Light elegant borders
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  glow: 'rgba(0, 220, 253, 0.4)', // Cyan glow
};

// Dark mode version in case the user switches their system to dark mode
export const darkColors = {
  background: '#0F172A', // Dark slate blue matching the logo vibe
  surface: '#1E293B',    // Lighter slate
  surfaceLight: '#334155', 
  accent: '#00DCFD',     // Cyan stands out better on dark
  accentSecondary: '#0069E8',
  accentMuted: 'rgba(0, 220, 253, 0.15)',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
  glow: 'rgba(0, 220, 253, 0.3)',
};

export const useTheme = () => {
  const colorScheme = useDeviceColorScheme();
  
  // Actually dynamically use light/dark, but since user explicitly wanted lighter colorful theme,
  // we will default to light for now, or let system handle it properly.
  // Many users leave their phones on light mode.
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  
  return {
    colors,
    spacing,
    radius,
    typography,
    glass,
    isDark: colorScheme === 'dark'
  };
};

export const theme = {
  colors: lightColors, // Fallback for static imports
  spacing,
  radius,
  typography,
  glass,
};
