import { theme } from './theme';

export const effects = {
  glass: {
    backgroundColor: 'rgba(28, 28, 30, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  glow: {
    // Subtle gold glow
    gold: {
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    // Subtle surface glow
    surface: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 3,
    }
  }
} as const;
