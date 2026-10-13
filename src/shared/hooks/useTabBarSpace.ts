import { create } from 'zustand';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarState {
  height: number;
  setHeight: (height: number) => void;
}

/** Height of the floating (glass) tab bar, reported by the tab bars on layout. */
export const useTabBarStore = create<TabBarState>((set) => ({
  height: 0,
  setHeight: (height) => set({ height }),
}));

/**
 * Bottom padding a tab screen needs so its last items can scroll above the
 * floating tab bar (the bar no longer takes room in the layout).
 */
export const useTabBarSpace = (extra = 16) => {
  const insets = useSafeAreaInsets();
  const height = useTabBarStore((s) => s.height);
  return (height > 0 ? height : 72 + Math.max(insets.bottom, 12)) + extra;
};
