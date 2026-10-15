import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RichChatMessage } from '../../components/RichChatMessage';

/** Parfois le modèle écrit l'appel d'un outil comme du texte : on le retire de l'affichage. */
const TOOL_TEXT = /\b(suggest_followups|ask_choices|show_stats|show_chart|show_table|propose_[a-z_]+|list_athletes|get_[a-z_]+|weekly_summary|team_readiness|draft_announcement)\s*\([\s\S]*?\)\s*/g;
export const cleanText = (t: string) => t.replace(TOOL_TEXT, '').trim();
import { AIAnalysisDashboardCard } from '../../components/AIAnalysisDashboardCard';
import type { MessagePart, UiBlock } from './types';
import { ChartBlock } from './blocks/ChartBlock';
import { ChoicesBlock, StatsBlock, TableBlock } from './blocks/DataBlocks';
import {
  AnnouncementBlock,
  CompetitionsBlock,
  GoalProposalBlock,
  PhilosophyBlock,
  PlanProposalBlock,
  SessionsProposalBlock,
} from './blocks/ProposalBlocks';
import { SuggestionsBlock } from './blocks/SuggestionsBlock';

const LEGACY_BLOCKS = /```(workout_proposal|analysis_dashboard|metric_picker|competition_results|save_philosophy)[\s\S]*?(```|$)/gi;
const LEGACY_DASHBOARD = /```analysis_dashboard([\s\S]*?)```/i;

interface Props {
  parts?: MessagePart[];
  /** Messages saved before Sprinty 2: plain text with fenced JSON blocks. */
  content: string;
  /** Only the latest message's questions can still be answered. */
  interactive: boolean;
  onAnswer: (text: string) => void;
  onAskChange: (text: string) => void;
  onPatch: (partIndex: number, patch: Record<string, unknown>) => void;
}

export function SprintyBlock({
  block,
  interactive,
  onAnswer,
  onAskChange,
  onPatch,
}: {
  block: UiBlock;
  interactive: boolean;
  onAnswer: (text: string) => void;
  onAskChange: (text: string) => void;
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const actions = { onPatch, onAskChange };
  switch (block.type) {
    case 'chart':
      return <ChartBlock data={block} />;
    case 'stats':
      return <StatsBlock data={block} />;
    case 'table':
      return <TableBlock data={block} />;
    case 'choices':
      return (
        <ChoicesBlock
          data={block}
          disabled={!interactive}
          onSubmit={(text) => {
            onPatch({ answered: true });
            onAnswer(text);
          }}
        />
      );
    case 'sessions_proposal':
      return <SessionsProposalBlock data={block} {...actions} />;
    case 'plan_proposal':
      return <PlanProposalBlock data={block} {...actions} />;
    case 'goal_proposal':
      return <GoalProposalBlock data={block} {...actions} />;
    case 'announcement_draft':
      return <AnnouncementBlock data={block} {...actions} />;
    case 'philosophy':
      return <PhilosophyBlock data={block} {...actions} />;
    case 'competitions':
      return <CompetitionsBlock data={block} />;
    case 'suggestions':
      return <SuggestionsBlock items={block.items} disabled={!interactive} onSelect={onAnswer} />;
    default:
      return null;
  }
}

export function SprintyMessageView({ parts, content, interactive, onAnswer, onAskChange, onPatch }: Props) {
  if (!parts?.length) {
    // Older conversations: keep the analysis dashboard, drop the other raw blocks
    let dashboard: any = null;
    const m = content.match(LEGACY_DASHBOARD);
    if (m?.[1]) {
      try {
        dashboard = JSON.parse(m[1].trim());
      } catch {
        dashboard = null;
      }
    }
    const text = content.replace(LEGACY_BLOCKS, '').trim();
    return (
      <View style={styles.stack}>
        {dashboard && <AIAnalysisDashboardCard data={dashboard} />}
        {text ? <RichChatMessage content={text} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {parts.map((p, i) =>
        p.kind === 'text' ? (
          cleanText(p.text) ? <RichChatMessage key={i} content={cleanText(p.text)} /> : null
        ) : (
          <SprintyBlock
            key={i}
            block={p.block}
            interactive={interactive}
            onAnswer={onAnswer}
            onAskChange={onAskChange}
            onPatch={(patch) => onPatch(i, patch)}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', gap: 10 },
});
