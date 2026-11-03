import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../core/theme';
import { SegmentedControl } from '../../../shared/components/SegmentedControl';
import { AI_INSTRUCTIONS, AI_MCP_URL, AI_OPENAPI_URL, AiGuideKind, mcpUrlWithKey, promptForAi } from '../../../services/aiAccessService';
import { CopyField, Section, Step } from './ui';

const KINDS: { key: AiGuideKind; label: string }[] = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'claude', label: 'Claude' },
  { key: 'autre', label: 'Autre IA' },
];

/**
 * Step-by-step setup for ChatGPT (custom GPT action), Claude (custom connector) or any other AI (full message).
 * With `apiKey` (right after creating a key) every value is ready to copy; without it, the athlete pastes their own key.
 */
export function AiGuide({ kind, onKindChange, apiKey }: { kind: AiGuideKind; onKindChange: (k: AiGuideKind) => void; apiKey?: string }) {
  const keyField = apiKey ? <CopyField value={apiKey} label="TA CLÉ" what="Clé" /> : <Text style={styles.hint}>Colle la clé copiée à sa création.</Text>;

  return (
    <View>
      <SegmentedControl options={KINDS} value={kind} onChange={onKindChange} style={styles.segmented} />

      {kind === 'chatgpt' && (
        <Section footer="Il faut un abonnement ChatGPT payant pour créer un GPT. ChatGPT te demandera de confirmer chaque lecture.">
          <Step n={1} title="Sur chatgpt.com, ouvre Explorer les GPT › Créer, puis l’onglet Configurer." />
          <Step n={2} title="En bas, touche Créer une action › Importer depuis une URL, et colle cette adresse :">
            <CopyField value={AI_OPENAPI_URL} what="Adresse" />
          </Step>
          <Step n={3} title="Dans Authentification, choisis Clé API, type Bearer, puis colle ta clé.">{keyField}</Step>
          <Step n={4} title="Colle les consignes dans le champ Instructions du GPT.">
            <CopyField value={AI_INSTRUCTIONS} what="Consignes" mono={false} feminine />
          </Step>
          <Step n={5} title="Enregistre en « Moi uniquement », puis pose ta question au GPT." last />
        </Section>
      )}

      {kind === 'claude' && (
        <Section footer="Ta clé fait partie de l’adresse : ne la partage avec personne d’autre.">
          <Step n={1} title="Sur claude.ai, ouvre Paramètres › Connecteurs › Ajouter un connecteur personnalisé." />
          <Step n={2} title={apiKey ? 'Donne-lui un nom (Sprintys) et colle cette adresse :' : 'Donne-lui un nom (Sprintys) et colle l’adresse suivie de ta clé :'}>
            {apiKey ? <CopyField value={mcpUrlWithKey(apiKey)} what="Adresse" /> : <CopyField value={`${AI_MCP_URL}?key=`} what="Adresse" />}
          </Step>
          <Step n={3} title="Active le connecteur dans une conversation, puis pose ta question." last />
        </Section>
      )}

      {kind === 'autre' && (
        <Section footer="Toutes les IA ne savent pas ouvrir une adresse. Si la tienne n’y arrive pas, préfère ChatGPT ou Claude.">
          <Step n={1} title={apiKey ? 'Copie le message complet :' : 'Copie le message complet à la création de la clé.'}>
            {apiKey ? <CopyField value={promptForAi(apiKey)} what="Message" mono={false} feminine={false} /> : null}
          </Step>
          <Step n={2} title="Colle-le au début de ta conversation avec l’IA, puis pose ta question." last />
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { marginBottom: theme.spacing.lg },
  hint: { fontSize: 13, color: theme.colors.textSecondary },
});
