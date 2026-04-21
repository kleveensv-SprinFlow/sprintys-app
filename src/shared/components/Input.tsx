import React from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  ViewStyle 
} from 'react-native';
import { theme } from '../../core/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputContainer,
        error ? styles.inputError : styles.inputNormal
      ]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.accent}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: theme.typography.fontWeights.medium as any,
    marginBottom: theme.spacing.sm,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  inputContainer: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    borderWidth: 1,
  },
  inputNormal: {
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  input: {
    color: theme.colors.text,
    fontSize: 16,
    height: '100%',
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
});
