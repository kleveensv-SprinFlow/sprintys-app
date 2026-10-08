import { supabase } from './supabase';
import { HEALTH_CONSENT_TEXT, HEALTH_CONSENT_VERSION } from '../legal/notices';

export const healthConsent = {
  async has(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from('user_consents')
      .select('id')
      .eq('user_id', user.id)
      .eq('consent_type', 'health_data')
      .is('revoked_at', null)
      .limit(1);
    if (error) return false;
    return (data?.length || 0) > 0;
  },

  async grant(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase.from('user_consents').insert({
      user_id: user.id,
      consent_type: 'health_data',
      consent_text: HEALTH_CONSENT_TEXT,
      version: HEALTH_CONSENT_VERSION,
    });
    return !error;
  },

  async revoke(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('consent_type', 'health_data')
      .is('revoked_at', null);
    return !error;
  },
};
