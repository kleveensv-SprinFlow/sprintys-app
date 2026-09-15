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

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false });

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
  }
};
