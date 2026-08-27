import React from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { RegisterMultiStep } from '../../src/features/auth/components/RegisterMultiStep';
import { useTheme } from '../../src/core/theme';

export default function SignupScreen() {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.inner}>
        <RegisterMultiStep />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 24, // theme.spacing.xl
    justifyContent: 'center',
    alignItems: 'center',
  },
});
