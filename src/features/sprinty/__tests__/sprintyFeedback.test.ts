import { useSprintyChatStore } from '../../../store/sprintyChatStore';
import { summarizeBlock } from '../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Sprinty Feedback et Suggestions (Tâche T2)', () => {
  beforeEach(() => {
    useSprintyChatStore.getState().reset();
  });

  describe('sprintyChatStore - gestion des IDs et du feedback', () => {
    it('attribue un identifiant unique aux messages ajoutés sans ID', () => {
      const store = useSprintyChatStore.getState();
      const convId = store.startNewConversation();

      store.addMessage({
        role: 'assistant',
        content: 'Voici mon analyse de tes séances.',
      });

      const messages = store.getCurrentMessages();
      const lastMsg = messages[messages.length - 1];

      expect(lastMsg.id).toBeDefined();
      expect(typeof lastMsg.id).toBe('string');
      expect(lastMsg.id!.length).toBeGreaterThan(0);
    });

    it('permet de voter pouce haut, pouce bas et de retirer son vote', () => {
      const store = useSprintyChatStore.getState();
      const convId = store.startNewConversation();

      store.addMessage({
        id: 'msg-test-1',
        role: 'assistant',
        content: 'Conseil personnalisé.',
      });

      const messageIndex = store.getCurrentMessages().length - 1;

      // 1. Pouce haut
      store.setMessageFeedback(convId, messageIndex, 1);
      expect(store.getCurrentMessages()[messageIndex].feedback).toBe(1);

      // 2. Pouce bas
      store.setMessageFeedback(convId, messageIndex, -1);
      expect(store.getCurrentMessages()[messageIndex].feedback).toBe(-1);

      // 3. Retrait du vote
      store.setMessageFeedback(convId, messageIndex, null);
      expect(store.getCurrentMessages()[messageIndex].feedback).toBeNull();
    });
  });

  describe('summarizeBlock - bloc suggestions', () => {
    it('résume correctement le bloc de suggestions pour la mémoire de conversation', () => {
      const summary = summarizeBlock({
        type: 'suggestions',
        items: ['Analyser ma forme sur 30 jours', 'Ajuster mes séances de sprint'],
      });

      expect(summary).toBe(
        '[Suggestions proposées : Analyser ma forme sur 30 jours ; Ajuster mes séances de sprint]'
      );
    });
  });
});
