import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../core/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: isFocused ? theme.colors.sprintyBlue : theme.colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View 
        style={[
          styles.inputContainer,
          { 
            backgroundColor: isFocused ? theme.colors.surface : theme.colors.glassFill,
            borderColor: error ? theme.colors.error : isFocused ? theme.colors.sprintyBlue : 'transparent',
          }
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: theme.colors.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.sprintyBlue}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  inputContainer: {
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  leftIconContainer: {
    flexShrink: 0,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Never shrinks: the field gives way instead (the eye used to overflow the border)
  rightIconContainer: {
    marginLeft: 6,
    marginRight: -8,
    minWidth: 36,
    height: 44,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
