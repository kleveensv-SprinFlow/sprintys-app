export const theme = {
  colors: {
    background: '#050505', // Near black
    surface: '#121212',    // Slightly lighter dark for cards/modals
    surfaceLight: '#1C1C1E', // Elevated surface
    accent: '#D4AF37',     // Subtle Gold
    accentMuted: 'rgba(212, 175, 55, 0.1)',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textMuted: '#48484A',
    border: '#2C2C2E',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FFD60A',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
  },
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
  typography: {
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
  },
  glass: {
    backgroundColor: 'rgba(28, 28, 30, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  }
} as const;

export type Theme = typeof theme;
