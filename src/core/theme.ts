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

// Sprintflow "Living Flow" Identity
// Defaulting to Dark Mode for everyone to keep the strong, vibrant athletic identity
export const darkColors = {
  background: '#050505', // Deep abyss black
  surface: '#121212',    // Dark grey for cards
  surfaceLight: '#1C1C1E', // Elevated surface
  accent: '#FF5722',     // SPRINT FIRE ORANGE! (Primary energetic color)
  accentMuted: 'rgba(255, 87, 34, 0.15)',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#48484A',
  border: '#2C2C2E',     // Subtle borders for glassmorphism
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FF9F0A',
  // Specific gradients and glows
  glow: 'rgba(255, 87, 34, 0.4)',
};

// We keep lightColors for system compatibility, but ideally Sprintflow is dark-first.
export const lightColors = {
  background: '#FFFFFF', 
  surface: '#F2F2F7',    
  surfaceLight: '#E5E5EA', 
  accent: '#FF5722',     
  accentMuted: 'rgba(255, 87, 34, 0.1)',
  text: '#000000',       
  textSecondary: '#8E8E93', 
  textMuted: '#C7C7CC',
  border: '#E5E5EA',     
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  glow: 'rgba(255, 87, 34, 0.3)',
};

export const theme = {
  colors: darkColors, // We force dark mode colors for the strong identity for now!
  spacing,
  radius,
  typography,
};

// If we want it to be responsive to device settings later:
export const useTheme = () => {
  const colorScheme = useDeviceColorScheme();
  // Force dark mode for the "Living Flow" identity, or uncomment to allow light mode
  // const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const colors = darkColors;
  
  return {
    colors,
    spacing,
    radius,
    typography,
  };
};
