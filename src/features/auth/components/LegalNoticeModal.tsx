import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../core/theme';
import { LEGAL_NOTICE } from '../../../legal/notices';

export function LegalNoticeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.wrap, { backgroundColor: theme.colors.background, paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Mentions et conditions</Text>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={[styles.body, { color: theme.colors.text }]}>{LEGAL_NOTICE}</Text>
        </ScrollView>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.close, { backgroundColor: theme.colors.accent, marginBottom: Math.max(insets.bottom, 16) }]}
        >
          <Text style={styles.closeText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  close: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
