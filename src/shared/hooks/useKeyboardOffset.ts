import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UseKeyboardOffsetOptions {
  extraMargin?: number;
  onKeyboardShow?: () => void;
}

export function useKeyboardOffset(options: UseKeyboardOffsetOptions = {}) {
  const { extraMargin = 20, onKeyboardShow } = options;
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      if (onKeyboardShow) {
        setTimeout(onKeyboardShow, 100);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [onKeyboardShow]);

  // On Android with Edge-to-Edge:
  // e.endCoordinates.height doesn't account for insets.bottom (system nav bar).
  // Adding insets.bottom + extraMargin gives a comfortable, breathable margin above the keys.
  const bottomOffset =
    isKeyboardVisible && keyboardHeight > 0
      ? Platform.OS === 'android'
        ? keyboardHeight + (insets.bottom || 0) + extraMargin
        : 0 // On iOS, KeyboardAvoidingView or native layout handles padding
      : Math.max(12, insets.bottom);

  return {
    keyboardHeight,
    isKeyboardVisible,
    bottomOffset,
    dismissKeyboard: Keyboard.dismiss,
  };
}
