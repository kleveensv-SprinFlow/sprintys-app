import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Feather } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, rightComponent, showBackButton, onBackPress }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20), backgroundColor: theme.colors.background }]}>
      {showBackButton && (
        <TouchableOpacity style={styles.leftContainer} onPress={onBackPress}>
          <Feather name="chevron-left" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      )}
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {title}
      </Text>
      {rightComponent && (
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)', // Very subtle separator, or remove if preferred
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    flexDirection: 'row',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'center',
  },
  leftContainer: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    zIndex: 11,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    zIndex: 11,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
