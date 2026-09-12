import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../../services/supabase';
import { theme } from '../../core/theme';

interface PollOption {
  id: string;
  text: string;
}

interface PollMessageProps {
  messageId: string;
  question: string;
  options: PollOption[];
  multipleChoice?: boolean;
  currentUserId: string;
  isCoach: boolean;
}

export const PollMessage = ({ messageId, question, options, multipleChoice, currentUserId, isCoach }: PollMessageProps) => {
  const [votes, setVotes] = useState<any[]>([]);

  useEffect(() => {
    fetchVotes();
    const sub = supabase.channel(`poll_${messageId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes', filter: `message_id=eq.${messageId}` }, fetchVotes)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [messageId]);

  const fetchVotes = async () => {
    const { data } = await supabase.from('poll_votes').select('*').eq('message_id', messageId);
    if (data) setVotes(data);
  };

  const handleVote = async (optionId: string) => {
    const hasVoted = votes.find(v => v.user_id === currentUserId && v.option_id === optionId);
    
    if (hasVoted) {
      // Remove vote
      await supabase.from('poll_votes').delete().eq('message_id', messageId).eq('user_id', currentUserId).eq('option_id', optionId);
    } else {
      if (!multipleChoice) {
        // Remove existing votes first
        await supabase.from('poll_votes').delete().eq('message_id', messageId).eq('user_id', currentUserId);
      }
      await supabase.from('poll_votes').insert({ message_id: messageId, option_id: optionId, user_id: currentUserId });
    }
  };

  const totalVotes = votes.length;

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      {options.map((opt) => {
        const optionVotes = votes.filter(v => v.option_id === opt.id);
        const percent = totalVotes === 0 ? 0 : Math.round((optionVotes.length / totalVotes) * 100);
        const userVoted = votes.some(v => v.option_id === opt.id && v.user_id === currentUserId);

        return (
          <TouchableOpacity 
            key={opt.id} 
            style={[styles.optionBtn, userVoted && styles.optionBtnVoted]} 
            onPress={() => handleVote(opt.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.progress, { width: `${percent}%` }]} />
            <View style={styles.optionContent}>
              <Text style={[styles.optionText, userVoted && styles.optionTextVoted]}>{opt.text}</Text>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.totalText}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    minWidth: 200,
  },
  question: {
    fontWeight: '600',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 12,
  },
  optionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
    height: 40,
    justifyContent: 'center',
  },
  optionBtnVoted: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.accent + '40',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
  },
  optionText: {
    fontWeight: '500',
    color: theme.colors.text,
    fontSize: 14,
  },
  optionTextVoted: {
    color: theme.colors.accent,
  },
  percentText: {
    fontWeight: '400',
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  totalText: {
    fontWeight: '400',
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  }
});
