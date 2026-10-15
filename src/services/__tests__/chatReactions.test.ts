import { chatService } from '../chatService';
import { supabase } from '../supabase';

jest.mock('../supabase', () => {
  return {
    supabase: {
      from: jest.fn(),
      rpc: jest.fn(),
    },
  };
});

describe('Chat Service — Réactions, Citations & Annonces (Tâche T3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessageReactions', () => {
    it('renvoie un objet vide si aucun ID de message n’est fourni', async () => {
      const reactions = await chatService.getMessageReactions([]);
      expect(reactions).toEqual({});
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('regroupe correctement les réactions par message et marque userReacted', async () => {
      const mockLikes = [
        { message_id: 'msg-1', user_id: 'user-athlete', reaction: '🔥' },
        { message_id: 'msg-1', user_id: 'user-coach', reaction: '🔥' },
        { message_id: 'msg-1', user_id: 'user-other', reaction: '👍' },
        { message_id: 'msg-2', user_id: 'user-coach', reaction: '❤️' },
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: mockLikes, error: null }),
        }),
      });

      const reactions = await chatService.getMessageReactions(['msg-1', 'msg-2'], 'user-athlete');

      expect(reactions['msg-1']).toBeDefined();
      expect(reactions['msg-1']).toHaveLength(2);

      const fireReaction = reactions['msg-1'].find((r) => r.reaction === '🔥');
      expect(fireReaction).toBeDefined();
      expect(fireReaction?.count).toBe(2);
      expect(fireReaction?.userReacted).toBe(true);

      const thumbReaction = reactions['msg-1'].find((r) => r.reaction === '👍');
      expect(thumbReaction).toBeDefined();
      expect(thumbReaction?.count).toBe(1);
      expect(thumbReaction?.userReacted).toBe(false);

      const heartReaction = reactions['msg-2'].find((r) => r.reaction === '❤️');
      expect(heartReaction).toBeDefined();
      expect(heartReaction?.count).toBe(1);
      expect(heartReaction?.userReacted).toBe(false);
    });
  });

  describe('toggleReaction', () => {
    it('insère une nouvelle réaction si l’utilisateur n’avait pas encore réagi', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const res = await chatService.toggleReaction('msg-100', 'user-athlete', '💪');
      expect(res).toEqual({ added: true, reaction: '💪' });
      expect(mockInsert).toHaveBeenCalledWith({
        message_id: 'msg-100',
        user_id: 'user-athlete',
        reaction: '💪',
      });
    });

    it('supprime la réaction si l’utilisateur clique sur le même emoji', async () => {
      const mockDeleteEqUser = jest.fn().mockResolvedValue({ error: null });
      const mockDeleteEqMsg = jest.fn().mockReturnValue({ eq: mockDeleteEqUser });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockDeleteEqMsg });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { reaction: '❤️' } }),
            }),
          }),
        }),
        delete: mockDelete,
      });

      const res = await chatService.toggleReaction('msg-100', 'user-athlete', '❤️');
      expect(res).toEqual({ added: false, reaction: '❤️' });
      expect(mockDelete).toHaveBeenCalled();
    });

    it('met à jour la réaction si l’utilisateur choisit un emoji différent', async () => {
      const mockUpdateEqUser = jest.fn().mockResolvedValue({ error: null });
      const mockUpdateEqMsg = jest.fn().mockReturnValue({ eq: mockUpdateEqUser });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEqMsg });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: { reaction: '❤️' } }),
            }),
          }),
        }),
        update: mockUpdate,
      });

      const res = await chatService.toggleReaction('msg-100', 'user-athlete', '🔥');
      expect(res).toEqual({ added: true, reaction: '🔥' });
      expect(mockUpdate).toHaveBeenCalledWith({ reaction: '🔥' });
    });
  });

  describe('pinMessage et getPinnedMessage', () => {
    it('appelle la RPC pin_conversation_message pour épingler une annonce', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: { pinned_message_id: 'msg-announcement', pinned_by: 'coach-id' },
        error: null,
      });

      const res = await chatService.pinMessage('conv-team-1', 'msg-announcement');
      expect(supabase.rpc).toHaveBeenCalledWith('pin_conversation_message', {
        p_conversation_id: 'conv-team-1',
        p_message_id: 'msg-announcement',
      });
      expect(res).toEqual({ pinned_message_id: 'msg-announcement', pinned_by: 'coach-id' });
    });

    it('récupère le message épinglé et son contenu complet', async () => {
      const mockConv = {
        pinned_message_id: 'msg-announcement',
        pinned_at: '2026-10-25T14:00:00Z',
        pinned_by: 'coach-id',
      };
      const mockMsg = {
        id: 'msg-announcement',
        content: 'Rappel : séance de sprints sur piste demain à 18h !',
        sender_id: 'coach-id',
        created_at: '2026-10-25T14:00:00Z',
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockConv, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockMsg, error: null }),
            }),
          }),
        });

      const res = await chatService.getPinnedMessage('conv-team-1');
      expect(res).toEqual({
        message: mockMsg,
        pinned_at: mockConv.pinned_at,
        pinned_by: mockConv.pinned_by,
      });
    });
  });
});
