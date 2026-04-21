import { Platform } from 'react-native';
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
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
        },
        android: {
          elevation: 5,
        },
        web: {
          boxShadow: `0 0 10px ${theme.colors.accent}26`, // 26 is ~0.15 alpha
        }
      })
    },
    // Subtle surface glow
    surface: {
      ...Platform.select({
        ios: {
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.05)',
        }
      })
    }
  }
} as const;
