import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../core/theme';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { PressableScale } from '../../shared/components/PressableScale';
import { maxesService } from '../../services/maxesService';
import { toast } from '../../shared/feedback/appAlert';

interface Props {
  visible: boolean;
  onClose: () => void;
  athleteId: string;
  exerciseKey: string;
  label: string;
  /** Value set by hand, if any */
  manualKg: number | null;
  estimatedKg: number | null;
  onSaved: () => void;
}

/** Sets the 1RM used to turn "% 1RM" into kilos for one exercise. */
export const MaxEditSheet: React.FC<Props> = ({ visible, onClose, athleteId, exerciseKey, label, manualKg, estimatedKg, onSaved }) => {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setText(manualKg != null ? String(manualKg).replace('.', ',') : estimatedKg != null ? String(estimatedKg).replace('.', ',') : '');
  }, [visible, manualKg, estimatedKg]);

  const save = async (kg: number | null) => {
    if (busy) return;
    setBusy(true);
    try {
      await maxesService.set(athleteId, exerciseKey, label, kg);
      toast('success', kg == null ? 'Estimation automatique rétablie.' : `Max enregistré : ${String(kg).replace('.', ',')} kg.`);
      onSaved();
      onClose();
    } catch {
      toast('error', 'Impossible d’enregistrer ce max. Vérifie ta connexion.');
    } finally {
      setBusy(false);
    }
  };

  const value = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0 && value < 1000;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={label} subtitle="Max sur 1 répétition : il sert à calculer les charges prescrites en % du max.">
      <View style={{ gap: 14 }}>
        <Input
          label="1RM (kg)"
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="ex. 120"
          maxLength={6}
          returnKeyType="done"
        />
        {estimatedKg != null && (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Estimation d’après tes meilleures séries : {String(estimatedKg).replace('.', ',')} kg
          </Text>
        )}
        <Button title="Enregistrer" onPress={() => save(value)} disabled={!valid || busy} />
        {manualKg != null && (
          <PressableScale onPress={() => save(null)} accessibilityRole="button" style={styles.reset}>
            <Text style={[styles.resetText, { color: theme.colors.sprintyBlue }]}>Revenir à l’estimation</Text>
          </PressableScale>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  hint: { fontSize: 13, fontWeight: '500' },
  reset: { alignItems: 'center', paddingVertical: 8 },
  resetText: { fontSize: 15, fontWeight: '700' },
});
