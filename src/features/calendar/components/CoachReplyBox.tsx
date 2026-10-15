import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../core/theme';
import { PressableScale } from '../../../shared/components/PressableScale';
import { toast } from '../../../shared/feedback/appAlert';
import { supabase } from '../../../services/supabase';

export interface CoachFeedback {
  text: string;
  at: string;
}

const dateLabel = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
};

/**
 * The coach's answer under a session. The coach (looking at one athlete) writes or edits it; the athlete only reads it.
 * Written through a function that only accepts the coach who planned the session.
 */
export const CoachReplyBox: React.FC<{
  workoutId: string;
  value: CoachFeedback | null;
  editable: boolean;
  onSaved: (fb: CoachFeedback | null) => void;
}> = ({ workoutId, value, editable, onSaved }) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.text ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(value?.text ?? '');
    setEditing(false);
  }, [workoutId, value?.text]);

  if (!editable && !value?.text) return null;

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('set_coach_feedback', { p_workout: workoutId, p_text: text });
      if (error) throw error;
      const fb = (data as CoachFeedback | null) ?? null;
      onSaved(fb && fb.text ? fb : null);
      setEditing(false);
      toast('success', fb ? 'Réponse envoyée.' : 'Réponse retirée.');
    } catch {
      toast('error', 'Impossible d’envoyer la réponse. Vérifie ta connexion.');
    } finally {
      setBusy(false);
    }
  };

  const blue = theme.colors.sprintyBlue;
  return (
    <View style={[styles.box, { borderLeftColor: blue }]}>
      <View style={styles.head}>
        <Feather name="message-square" size={14} color={blue} />
        <Text style={[styles.label, { color: blue }]}>{editable ? 'Ta réponse' : 'Réponse de ton coach'}</Text>
        {!!value?.at && <Text style={[styles.date, { color: theme.colors.textMuted }]}>{dateLabel(value.at)}</Text>}
      </View>

      {editable && (editing || !value?.text) ? (
        <>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.glassFill }]}
            placeholder="Un mot sur sa séance : ce qui était bien, ce qu'on ajuste…"
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={blue}
            multiline
            maxLength={1000}
            value={text}
            onChangeText={setText}
          />
          <View style={styles.actions}>
            {!!value?.text && (
              <PressableScale onPress={() => { setText(value.text); setEditing(false); }} accessibilityRole="button" style={styles.ghost}>
                <Text style={[styles.ghostText, { color: theme.colors.textSecondary }]}>Annuler</Text>
              </PressableScale>
            )}
            <PressableScale
              onPress={save}
              disabled={busy || (!text.trim() && !value?.text)}
              accessibilityRole="button"
              style={[styles.send, { backgroundColor: blue, opacity: busy || (!text.trim() && !value?.text) ? 0.5 : 1 }]}
            >
              <Text style={styles.sendText}>{text.trim() ? 'Envoyer' : 'Retirer'}</Text>
            </PressableScale>
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.body, { color: theme.colors.text }]}>{value?.text}</Text>
          {editable && (
            <PressableScale onPress={() => setEditing(true)} accessibilityRole="button" style={styles.ghost}>
              <Text style={[styles.ghostText, { color: blue }]}>Modifier</Text>
            </PressableScale>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 14, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 },
  date: { fontSize: 12, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  input: { minHeight: 80, borderRadius: 14, padding: 12, fontSize: 15, fontWeight: '500', textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' },
  ghost: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 4 },
  ghostText: { fontSize: 14, fontWeight: '700' },
  send: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  sendText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
