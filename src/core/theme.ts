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
  full: 9999,
};

const typography = {
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
  },
};

export const lightColors = {
  background: '#F8F9FA', // Very light grey/white
  surface: '#FFFFFF',    // White cards
  surfaceLight: '#F1F3F5', // Elevated slightly darker surface
  accent: '#6366F1',     // Indigo/Purple/Blue accent like the image
  accentMuted: 'rgba(99, 102, 241, 0.1)',
  text: '#111827',       // Dark grey/almost black for contrast
  textSecondary: '#6B7280', // Grey for secondary text
  textMuted: '#9CA3AF',
  border: '#E5E7EB',     // Light grey border
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkColors = {
  background: '#050505', // Near black
  surface: '#121212',    // Slightly lighter dark for cards/modals
  surfaceLight: '#1C1C1E', // Elevated surface
  accent: '#6366F1',     // Keep the new accent color for dark mode too for brand consistency
  accentMuted: 'rgba(99, 102, 241, 0.15)',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#48484A',
  border: '#2C2C2E',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FFD60A',
};

export const lightTheme = {
  colors: lightColors,
  spacing,
  radius,
  typography,
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(0, 0, 0, 0.05)',
  }
} as const;

export const darkTheme = {
  colors: darkColors,
  spacing,
  radius,
  typography,
  glass: {
    backgroundColor: 'rgba(28, 28, 30, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  }
} as const;

// Create a state manager for the theme to be reactive
import { create } from 'zustand';

interface ThemeState {
  colorScheme: 'light' | 'dark' | 'system';
  setColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  colorScheme: 'system',
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
}));

export const useTheme = () => {
  const deviceColorScheme = useDeviceColorScheme();
  const { colorScheme } = useThemeStore();

  const activeScheme = colorScheme === 'system' ? (deviceColorScheme || 'light') : colorScheme;

  return activeScheme === 'dark' ? darkTheme : lightTheme;
};

// IMPORTANT: Fallback export for backward compatibility
// DO NOT use this `theme` object directly for dynamic styling anymore,
// Use `const theme = useTheme()` inside components instead.
// We keep it exported so the build doesn't break instantly everywhere.
export const theme = lightTheme;
export type Theme = typeof lightTheme;
