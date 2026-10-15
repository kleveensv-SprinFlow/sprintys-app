/** Does an exercise/block target (several shapes exist: {subgroups, athletes} or {type, id}) include this athlete? */
export const targetApplies = (tg: any, athleteId: string, subgroupId: string | null): boolean => {
  if (!tg || typeof tg !== 'object') return true;
  if (Array.isArray(tg.subgroups) || Array.isArray(tg.athletes)) {
    const sg: string[] = tg.subgroups || [];
    const at: string[] = tg.athletes || [];
    if (sg.length === 0 && at.length === 0) return true;
    return (!!subgroupId && sg.includes(subgroupId)) || at.includes(athleteId);
  }
  if (tg.type) {
    if (tg.type === 'all') return true;
    if (tg.type === 'subgroup') return !!subgroupId && tg.id === subgroupId;
    if (tg.type === 'athlete') return tg.id === athleteId;
  }
  return true;
};

/**
 * The part of a team session that is meant for one athlete. The template may be the coach's master copy
 * (the whole session) or one athlete's row, so exercises and technical notes are filtered by target and
 * anything that belongs to someone else (master flag, comment) is dropped. Null when nothing is for them.
 */
export const sessionForAthlete = (t: any, athleteId: string, subgroupId: string | null) => {
  const measures: any = { ...(t.measures || {}) };
  delete measures.is_master;
  delete measures.athlete_feedback;
  delete measures.coach_feedback;
  if (typeof measures.athlete_notes === 'string') delete measures.athlete_notes;
  let description = t.description;

  if (Array.isArray(measures.technical_notes)) {
    const mine = measures.technical_notes.filter((n: any) =>
      n?.targetType === 'team' ||
      (n?.targetType === 'subgroup' && !!subgroupId && n?.targetId === subgroupId) ||
      (n?.targetType === 'athlete' && n?.targetId === athleteId));
    if (mine.length === 0) return null;
    measures.athlete_notes = mine;
    description = mine
      .map((n: any) => `[${n.title?.trim() ? n.title.trim() : n.targetName}]\n${String(n.content ?? '').trim()}`)
      .join('\n\n');
  }

  const srcBlocks: any[] = Array.isArray(t.blocks) ? t.blocks : [];
  const hadExercises = srcBlocks.some((b: any) => (b?.exercises || []).length > 0);
  const blocks = srcBlocks
    .map((b: any) => ({ ...b, exercises: (b?.exercises || []).filter((ex: any) => targetApplies(ex?.targets ?? ex?.target, athleteId, subgroupId)) }))
    .filter((b: any, i: number) => (srcBlocks[i]?.exercises || []).length === 0 || b.exercises.length > 0);
  const exercises = (Array.isArray(t.exercises) ? t.exercises : []).filter((ex: any) => targetApplies(ex?.targets ?? ex?.target, athleteId, subgroupId));
  if (hadExercises && blocks.every((b: any) => (b.exercises || []).length === 0)) return null;

  return { blocks, exercises, description, measures };
};

