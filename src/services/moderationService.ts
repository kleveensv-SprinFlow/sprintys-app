import { supabase } from './supabase';

export const REPORT_REASONS = ['Harcèlement ou insulte', 'Contenu inapproprié', 'Spam', 'Autre'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Block list, user reports (Apple guideline 1.2 for user-generated content). */
export const moderationService = {
  async blockedIds(): Promise<Set<string>> {
    const { data, error } = await supabase.from('user_blocks').select('blocked_id');
    if (error) return new Set();
    return new Set((data || []).map((r: any) => r.blocked_id));
  },

  async block(blockedId: string): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { error } = await supabase.from('user_blocks').upsert({ blocker_id: auth.user.id, blocked_id: blockedId });
    if (error) console.error('block failed', error.message);
    return !error;
  },

  async unblock(blockedId: string): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { error } = await supabase.from('user_blocks').delete().eq('blocker_id', auth.user.id).eq('blocked_id', blockedId);
    return !error;
  },

  async report(params: {
    conversationId?: string | null;
    reportedUserId?: string | null;
    messageId?: string | null;
    reason: ReportReason;
    excerpt?: string;
  }): Promise<boolean> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const reason = params.excerpt ? `${params.reason} — « ${params.excerpt.slice(0, 280)} »` : params.reason;
    const full = {
      reporter_id: auth.user.id,
      conversation_id: params.conversationId ?? null,
      reported_user_id: params.reportedUserId ?? null,
      message_id: params.messageId ?? null,
      reason,
    };
    let { error } = await supabase.from('user_reports').insert(full);
    if (error && /reported_user_id|message_id/.test(error.message || '')) {
      // Older database without the detailed columns
      ({ error } = await supabase
        .from('user_reports')
        .insert({ reporter_id: auth.user.id, conversation_id: full.conversation_id, reason: `${reason} [user ${full.reported_user_id ?? '-'} · message ${full.message_id ?? '-'}]` }));
    }
    if (error) console.error('report failed', error.message);
    return !error;
  },
};
