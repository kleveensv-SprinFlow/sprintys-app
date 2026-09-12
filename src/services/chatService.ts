import { supabase } from './supabase';
import { Database } from '../types/supabase';

type Message = Database['public']['Tables']['messages']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

export const chatService = {
  async getOrCreateTeamConversation(teamId: string): Promise<Conversation | null> {
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('team_id', teamId)
      .eq('type', 'team')
      .single();

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
      .single();

    if (createError) {
      console.error('Error creating team conversation:', createError);
      return null;
    }

    return newConvo;
  },

  async getOrCreateDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
    // Note: In a real app we'd query via participants, but due to RLS it can be tricky.
    // We'll look for existing direct convos for userId1, then check if userId2 is in it.
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
        // Found existing conversation
        const { data: convo } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', otherParticipants[0].conversation_id)
          .single();
        if (convo) return convo;
      }
    }

    // Create new direct convo
    const { data: newConvo, error: createError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' })
      .select()
      .single();

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
