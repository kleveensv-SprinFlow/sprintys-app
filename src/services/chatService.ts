import { supabase } from './supabase';
import { Database } from '../types/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

export interface GroupDiscussionsSummary {
  team: {
    conversation_id: string | null;
    last_message: {
      content: string;
      created_at: string;
      sender_name: string;
    } | null;
    unread_count: number;
  };
  coach: {
    conversation_id: string | null;
    last_message: {
      content: string;
      created_at: string;
      is_me: boolean;
    } | null;
    unread_count: number;
  };
}

/** Taille d'une page de messages (le reste se charge en remontant). */
export const MESSAGES_PAGE = 50;

export const chatService = {
  async getOrCreateTeamConversation(teamId: string): Promise<Conversation | null> {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_or_create_team_conversation', {
        p_team_id: teamId
      });
      if (!rpcError && rpcData) {
        return rpcData as Conversation;
      }
      if (rpcError) {
        console.warn('RPC get_or_create_team_conversation warning, fallback:', rpcError.message);
      }
    } catch (e) {
      console.warn('RPC error on get_or_create_team_conversation:', e);
    }

    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('team_id', teamId)
      .eq('type', 'team')
      .maybeSingle();

    if (existing) return existing;
    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding team conversation:', findError);
      return null;
    }

    // Create it
    const { data: newConvo, error: createError } = await supabase
      .from('conversations')
      .insert({ type: 'team', team_id: teamId })
      .select()
      .maybeSingle();

    if (createError) {
      console.error('Error creating team conversation:', createError);
      return null;
    }

    return newConvo;
  },

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_or_create_direct_conversation', {
        p_other_user_id: userId2
      });
      if (!rpcError && rpcData) {
        return rpcData as Conversation;
      }
      if (rpcError) {
        console.warn('RPC get_or_create_direct_conversation warning, fallback:', rpcError.message);
      }
    } catch (e) {
      console.warn('RPC error on get_or_create_direct_conversation:', e);
    }

    // Fallback: look for existing direct convos for userId1, then check if userId2 is in it.
    const { data: myConvos } = await supabase
      .from('conversation_participants')
      .select('conversation_id, conversations(type)')
      .eq('user_id', userId1);

    const directConvoIds = myConvos
      ?.filter((c: any) => (c.conversations as any)?.type === 'direct')
      .map((c: any) => c.conversation_id) || [];

    if (directConvoIds.length > 0) {
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId2)
        .in('conversation_id', directConvoIds);

      if (otherParticipants && otherParticipants.length > 0) {
        const { data: convo } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', otherParticipants[0].conversation_id)
          .maybeSingle();
        if (convo) return convo;
      }
    }

    // Create new direct convo
    const { data: newConvo, error: createError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .maybeSingle();

    if (createError || !newConvo) {
      console.error('Error creating direct conversation:', createError);
      return null;
    }

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: newConvo.id, user_id: userId1 },
      { conversation_id: newConvo.id, user_id: userId2 }
    ]);

    return newConvo;
  },

  async getAthleteGroupDiscussions(teamId: string, coachId: string): Promise<GroupDiscussionsSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_athlete_group_discussions', {
        p_team_id: teamId,
        p_coach_id: coachId
      });
      if (error) throw error;
      return data as GroupDiscussionsSummary;
    } catch (e) {
      console.error('Error fetching athlete group discussions:', e);
      return null;
    }
  },

  async ensureParticipant(conversationId: string, userId: string) {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!data) {
      await supabase.from('conversation_participants').insert({
        conversation_id: conversationId,
        user_id: userId
      });
    }
  },

  /**
   * Une page de messages, du plus récent au plus ancien. `before` = `created_at` du plus ancien déjà chargé,
   * pour remonter dans l'historique sans tout recharger.
   */
  async getMessages(conversationId: string, opts: { before?: string; limit?: number } = {}): Promise<Message[]> {
    let q = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? MESSAGES_PAGE);
    if (opts.before) q = q.lt('created_at', opts.before);
    const { data, error } = await q;

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
    return data || [];
  },

  async sendMessage(conversationId: string, senderId: string, content: string, type: 'text' | 'poll' = 'text', metadata: any = null) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }
    return data;
  },

  async markAsRead(conversationId: string, userId: string, messageId: string) {
    await supabase
      .from('conversation_participants')
      .update({ last_read_message_id: messageId })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  },

  /** Charge les réactions regroupées par message et compte les votes. */
  async getMessageReactions(messageIds: string[], currentUserId?: string): Promise<Record<string, { reaction: string; count: number; userReacted: boolean }[]>> {
    if (!messageIds.length) return {};
    const { data, error } = await supabase
      .from('message_likes')
      .select('message_id, user_id, reaction')
      .in('message_id', messageIds);

    if (error || !data) return {};

    const result: Record<string, { reaction: string; count: number; userReacted: boolean }[]> = {};
    for (const row of data as any[]) {
      const msgId = row.message_id;
      const emoji = row.reaction || '❤️';
      if (!result[msgId]) result[msgId] = [];
      let entry = result[msgId].find((r) => r.reaction === emoji);
      if (!entry) {
        entry = { reaction: emoji, count: 0, userReacted: false };
        result[msgId].push(entry);
      }
      entry.count += 1;
      if (currentUserId && row.user_id === currentUserId) {
        entry.userReacted = true;
      }
    }
    return result;
  },

  /** Ajoute, met à jour ou retire la réaction d'un utilisateur sur un message. */
  async toggleReaction(messageId: string, userId: string, reaction: string): Promise<{ added: boolean; reaction: string }> {
    const { data: existing } = await supabase
      .from('message_likes')
      .select('reaction')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if ((existing as any).reaction === reaction) {
        await supabase
          .from('message_likes')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', userId);
        return { added: false, reaction };
      } else {
        await supabase
          .from('message_likes')
          .update({ reaction })
          .eq('message_id', messageId)
          .eq('user_id', userId);
        return { added: true, reaction };
      }
    } else {
      await supabase
        .from('message_likes')
        .insert({ message_id: messageId, user_id: userId, reaction });
      return { added: true, reaction };
    }
  },

  /** Épingle ou désépingle un message en tant qu'annonce (coach). */
  async pinMessage(conversationId: string, messageId: string | null) {
    const { data, error } = await supabase.rpc('pin_conversation_message', {
      p_conversation_id: conversationId,
      p_message_id: messageId,
    });
    if (error) {
      const { error: updateErr } = await supabase
        .from('conversations')
        .update({
          pinned_message_id: messageId,
          pinned_at: messageId ? new Date().toISOString() : null,
        })
        .eq('id', conversationId);
      if (updateErr) throw updateErr;
    }
    return data;
  },

  /** Récupère le message épinglé d'une conversation. */
  async getPinnedMessage(conversationId: string): Promise<{ message: Message | null; pinned_at: string | null; pinned_by: string | null } | null> {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('pinned_message_id, pinned_at, pinned_by')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr || !conv || !(conv as any).pinned_message_id) return null;

    const { data: msg } = await supabase
      .from('messages')
      .select('*')
      .eq('id', (conv as any).pinned_message_id)
      .maybeSingle();

    return {
      message: msg || null,
      pinned_at: (conv as any).pinned_at || null,
      pinned_by: (conv as any).pinned_by || null,
    };
  }
};
