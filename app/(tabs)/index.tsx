import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../../src/shared/components/ui/Button';
import { useAuthStore } from '../../src/store/useAuthStore';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/shared/theme/colors';

export default function Home() {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome {user?.email}</Text>
      <Button title="Logout" onPress={() => supabase.auth.signOut()} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
    fontSize: 20,
    marginBottom: 20,
  },
  button: {
    marginTop: 20,
  }
});
