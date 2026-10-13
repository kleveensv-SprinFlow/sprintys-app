import React, { useCallback, useState } from 'react';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../core/theme';

/**
 * Pull-to-refresh with the app's tint and a light haptic.
 * Usage: const refreshControl = useRefresh(() => reload());  <ScrollView refreshControl={refreshControl} />
 */
export function useRefresh(load: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      Haptics.selectionAsync().catch(() => undefined);
    } catch {
      // haptics unavailable (web)
    }
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.sprintyBlue}
      colors={[theme.colors.sprintyBlue]}
      progressBackgroundColor="#FFFFFF"
    />
  );
}
