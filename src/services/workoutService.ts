import { supabase } from './supabase';
import { sessionForAthlete } from './sessionForAthlete';
import { sessionKindOf } from '../features/workout/sessionKind';
import { Database } from '../types/supabase';
import { BuilderExercise } from '../store/workoutBuilderStore';

export interface WorkoutAssignment {
  nom_seance?: string;
  coach_id: string;
  athlete_id: string;
  type_seance: string;
  exercises: BuilderExercise[];
  date_prevue?: string;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/** A copy of a session is a fresh plan: what the athlete wrote on the original (comment) does not follow it. */
const copyMeasures = (m: any) => {
  if (!m || typeof m !== 'object') return m ?? null;
  const { athlete_feedback, rpe, duration_min, ...rest } = m;
  if (typeof rest.athlete_notes === 'string') delete rest.athlete_notes;
  return rest;
};

export const workoutService = {
  assignWorkoutToAthlete: async (assignment: WorkoutAssignment) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([
        {
          coach_id: assignment.coach_id,
          athlete_id: assignment.athlete_id,
          type_seance: assignment.type_seance,
          exercises: assignment.exercises,
          date_prevue: assignment.date_prevue || new Date().toISOString(),
          status: 'pending',
        }
      ])
      .select();

    if (error) throw error;
    return data;
  },

  fetchPendingWorkout: async (athleteId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  fetchUpcomingWorkouts: async (athleteId: string, daysBehind: number = 7, daysAhead: number = 14) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBehind);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('athlete_id', athleteId)
      .gte('date_prevue', startDate.toISOString())
      .lte('date_prevue', endDate.toISOString())
      .order('date_prevue', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  
  
  assignWorkoutToGroup: async (workoutData: any, targetType: 'team' | 'subgroup', targetId: string) => {
    const rpcParams: any = {
      p_workout_data: workoutData
    };
    if (targetType === 'team') {
      rpcParams.p_team_id = targetId;
    } else if (targetType === 'subgroup') {
      rpcParams.p_subgroup_id = targetId;
    }

    const { data, error } = await supabase.rpc('assign_workout_to_group', rpcParams);
    if (error) throw error;
    return data; // Returns the generated UUID
  },

  createPlannedWorkout: async (workoutData: any) => {
    const { data, error } = await supabase
      .from('workouts')
      .insert([workoutData])
      .select();
    
    if (error) throw error;
    return data;
  },

  updateWorkout: async (workoutId: string, workoutData: any) => {
    const { data, error } = await supabase
      .from('workouts')
      .update(workoutData)
      .eq('id', workoutId)
      .select();
    
    if (error) throw error;
    return data;
  },

  fetchWorkoutsByGroupAssignment: async (groupAssignmentId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('group_assignment_id', groupAssignmentId);
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Who an existing assignment was planned for. Every save sets group_assignment_id and each athlete's
   * subgroup_id, so a single row cannot tell "one athlete" from "the team": look at the sibling rows.
   */
  resolveAssignmentTarget: async (
    workout: any,
    coachId?: string,
  ): Promise<{ type: 'team' | 'subgroup' | 'athlete'; id: string | null }> => {
    if (!workout?.group_assignment_id) {
      if (workout?.athlete_id) return { type: 'athlete', id: workout.athlete_id };
      return { type: 'team', id: null };
    }
    const { data } = await supabase
      .from('workouts')
      .select('athlete_id, subgroup_id')
      .eq('group_assignment_id', workout.group_assignment_id);
    const rows = (data || []).filter((r: any) => r.athlete_id && r.athlete_id !== coachId);
    if (rows.length === 1) return { type: 'athlete', id: rows[0].athlete_id };
    const subgroups = new Set(rows.map((r: any) => r.subgroup_id));
    if (rows.length > 1 && subgroups.size === 1 && rows[0].subgroup_id) return { type: 'subgroup', id: rows[0].subgroup_id };
    return { type: 'team', id: null };
  },

  smartUpdateWorkouts: async (oldGroupAssignmentId: string | undefined | null, newPayloads: any[], legacyWorkoutId?: string | null) => {
    let existingWorkouts: any[] = [];
    if (oldGroupAssignmentId) {
      existingWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(oldGroupAssignmentId);
    } else if (legacyWorkoutId) {
      // Older single-athlete sessions have no group_assignment_id: update that row instead of adding a duplicate
      const { data, error } = await supabase.from('workouts').select('*').eq('id', legacyWorkoutId);
      if (error) throw error;
      existingWorkouts = data || [];
    }

    const payloadsToInsert: any[] = [];
    const idsToKeep: string[] = [];

    for (const payload of newPayloads) {
      const existing = existingWorkouts.find((w: any) => w.athlete_id === payload.athlete_id);
      if (existing) {
        // Keep the existing ID so athlete_efforts don't break, and keep what belongs to the athlete:
        // a session already validated stays validated, and their own comment is not wiped by the coach's edit.
        const prev = existing.measures || {};
        const measures: any = { ...(payload.measures || {}) };
        if (prev.athlete_feedback != null) measures.athlete_feedback = prev.athlete_feedback;
        if (prev.rpe != null) measures.rpe = prev.rpe;
        if (prev.duration_min != null) measures.duration_min = prev.duration_min;
        // Comment written before athlete_feedback existed lived in athlete_notes (as text)
        if (prev.athlete_feedback == null && typeof prev.athlete_notes === 'string' && prev.athlete_notes) measures.athlete_feedback = prev.athlete_notes;
        if (typeof prev.athlete_notes === 'string' && measures.athlete_notes === undefined) measures.athlete_notes = prev.athlete_notes;
        // The status is left out of the update so the database keeps its own value (an athlete may validate meanwhile)
        const { status: _plannedStatus, ...rest } = payload;
        await workoutService.updateWorkout(existing.id, { ...rest, measures });
        idsToKeep.push(existing.id);
      } else {
        payloadsToInsert.push(payload);
      }
    }

    if (payloadsToInsert.length > 0) {
      const { error } = await supabase.from('workouts').insert(payloadsToInsert);
      if (error) throw error;
    }

    // Delete existing workouts that are no longer in the new assigned group
    const idsToDelete = existingWorkouts
      .filter((w: any) => !idsToKeep.includes(w.id))
      .map((w: any) => w.id);

    if (idsToDelete.length > 0) {
      const { error } = await supabase.from('workouts').delete().in('id', idsToDelete);
      if (error) throw error;
    }
  },

  saveWorkoutTemplate: async (templateData: any) => {
    const { data, error } = await supabase
      .from('workout_templates')
      .insert([templateData])
      .select();

    if (error) throw error;
    return data;
  },

  fetchWorkoutTemplates: async (coachId: string, typeSeance?: string | string[]) => {
    try {
      let query = supabase
        .from('workout_templates')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (Array.isArray(typeSeance)) {
        query = query.in('type_seance', typeSeance);
      } else if (typeSeance) {
        query = query.eq('type_seance', typeSeance);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching workout templates:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('Unexpected error fetching templates:', err);
      return [];
    }
  },

  /**
   * Keep a planned session as a reusable template (any type). What belongs to the athletes (comment, felt effort,
   * validation) and to this particular day (group, master flag) is not kept.
   */
  saveSessionAsTemplate: async (coachId: string, name: string, picked: any) => {
    // A group session is saved from the coach's master copy (the complete plan), not from one athlete's filtered row
    let workout = picked;
    if (picked.group_assignment_id && !picked.measures?.is_master) {
      try {
        const rows = await workoutService.fetchWorkoutsByGroupAssignment(picked.group_assignment_id);
        const master = rows.find((r: any) => r.measures?.is_master);
        if (master) workout = { ...master, type_seance: picked.type_seance || master.type_seance };
      } catch {
        /* falls back to the row the coach opened */
      }
    }
    const measures: any = { ...(workout.measures || {}) };
    for (const k of ['is_master', 'athlete_feedback', 'rpe', 'duration_min', 'has_time']) delete measures[k];
    if (typeof measures.athlete_notes === 'string') delete measures.athlete_notes;
    measures.kind = sessionKindOf(workout);
    if (workout.measures?.has_time && workout.date_prevue) {
      const d = new Date(workout.date_prevue);
      measures.time_hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return workoutService.saveWorkoutTemplate({
      coach_id: coachId,
      name: name.trim(),
      type_seance: workout.type_seance,
      description: workout.description || null,
      intensity: workout.intensity ?? null,
      blocks: workout.blocks || [],
      exercises: workout.exercises || [],
      measures,
    });
  },

  /**
   * Plan a template on a day for a team: one row per athlete (only what targets them) sharing a group id,
   * plus the coach's master copy for sessions that have exercises, like the builders do.
   */
  createFromTemplate: async (
    coachId: string,
    teamId: string,
    members: { user_id: string; subgroup_id?: string | null }[],
    template: any,
    day: Date,
  ): Promise<number> => {
    if (members.length === 0) throw new Error('no_members');
    const at = new Date(day);
    const hm = typeof template.measures?.time_hm === 'string' ? template.measures.time_hm.match(/^(\d{2}):(\d{2})$/) : null;
    if (hm) at.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
    else at.setHours(12, 0, 0, 0);

    const base = {
      coach_id: coachId,
      team_id: teamId,
      group_assignment_id: generateUUID(),
      date_prevue: at.toISOString(),
      type_seance: template.type_seance,
      intensity: template.intensity ?? null,
      status: 'pending',
    };
    const flags: any = hm ? { has_time: true } : {};
    const kind = (template.measures?.kind as string) || sessionKindOf(template);
    const withMaster = members.length > 1 && ['run', 'strength', 'stairs'].includes(kind);

    const rows: any[] = [];
    if (withMaster) {
      const { time_hm: _t, ...m } = template.measures || {};
      rows.push({
        ...base,
        athlete_id: coachId,
        description: template.description || null,
        blocks: template.blocks || [],
        exercises: template.exercises || [],
        measures: { ...m, ...flags, is_master: true },
      });
    }
    for (const member of members) {
      const mine = sessionForAthlete(template, member.user_id, member.subgroup_id ?? null);
      if (!mine) continue;
      const { time_hm: _t, ...m } = mine.measures || {};
      rows.push({
        ...base,
        athlete_id: member.user_id,
        subgroup_id: member.subgroup_id ?? null,
        description: mine.description || null,
        blocks: mine.blocks,
        exercises: mine.exercises,
        measures: { ...m, ...flags },
      });
    }
    const athleteRows = rows.filter((r) => !r.measures?.is_master);
    if (athleteRows.length === 0) throw new Error('nobody_targeted');
    await workoutService.smartUpdateWorkouts(undefined, rows);
    return athleteRows.length;
  },

  /** Monday 00:00 (local) of the week containing a date. */
  weekStart: (d: Date): Date => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  },

  /** Sessions of the coach in the week starting at `monday` (rows of every athlete and the master copies). */
  fetchWeekRows: async (coachId: string, monday: Date) => {
    const end = new Date(monday);
    end.setDate(end.getDate() + 7);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('coach_id', coachId)
      .gte('date_prevue', monday.toISOString())
      .lt('date_prevue', end.toISOString());
    if (error) throw error;
    return data || [];
  },

  /**
   * Copy a whole week onto another one. Every session is copied as a fresh plan (nothing validated, no athlete
   * comment), each group keeps being one group, and the original week is left as it is.
   */
  copyWeek: async (coachId: string, fromMonday: Date, toMonday: Date): Promise<{ sessions: number; rows: number }> => {
    const fetched = await workoutService.fetchWeekRows(coachId, fromMonday);
    // Only athletes still approved in their team receive a copy (people who left or were removed are skipped)
    const teamIds = [...new Set(fetched.map((w: any) => w.team_id).filter(Boolean))] as string[];
    const approved = new Set<string>();
    for (const t of teamIds) {
      for (const m of await workoutService.fetchApprovedMembers(t)) approved.add(`${t}:${m.user_id}`);
    }
    const rows = fetched.filter(
      (w: any) => w.measures?.is_master || w.athlete_id === coachId || !w.team_id || approved.has(`${w.team_id}:${w.athlete_id}`),
    );
    if (rows.length === 0) return { sessions: 0, rows: 0 };
    const days = Math.round((toMonday.getTime() - fromMonday.getTime()) / 86400000);
    const groupIds = new Map<string, string>();
    const copies = rows.map((w: any) => {
      const { id, created_at, updated_at, athlete_efforts, done_count, athlete_count, ...rest } = w;
      const key = w.group_assignment_id || w.id;
      if (!groupIds.has(key)) groupIds.set(key, generateUUID());
      const at = new Date(w.date_prevue);
      at.setDate(at.getDate() + days);
      return {
        ...rest,
        measures: copyMeasures(rest.measures),
        date_prevue: at.toISOString(),
        status: 'pending',
        group_assignment_id: groupIds.get(key),
      };
    });
    // One insert: either the whole week is copied or nothing is
    const { error } = await supabase.from('workouts').insert(copies);
    if (error) throw error;
    return { sessions: groupIds.size, rows: copies.length };
  },

  /** Athletes currently approved in a team (id + subgroup). */
  fetchApprovedMembers: async (teamId: string): Promise<{ user_id: string; subgroup_id: string | null }[]> => {
    const { data, error } = await supabase
      .from('team_members')
      .select('user_id, subgroup_id, status')
      .eq('team_id', teamId);
    if (error) throw error;
    return (data || [])
      .filter((m: any) => (m.status || 'approved') === 'approved')
      .map((m: any) => ({ user_id: m.user_id, subgroup_id: m.subgroup_id ?? null }));
  },

  deleteWorkoutTemplate: async (templateId: string) => {
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  },

  fetchRecentWorkoutsForCoach: async (coachId: string, limit: number = 5) => {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error fetching recent workouts for coach:', error);
        return [];
      }

      // Deduplicate multi-athlete clones (by group_assignment_id or date + description)
      const seen = new Set<string>();
      const result: any[] = [];
      for (const w of (data || [])) {
        const type = (w.type_seance || '').toLowerCase();
        const isRun = type.includes('piste') || type.includes('côte') || type.includes('cote') || type.includes('course') || type.includes('sprint');
        if (!isRun) continue;

        const key = w.group_assignment_id || `${w.date_prevue}_${w.description}`;
        if (!seen.has(key)) {
          seen.add(key);
          result.push(w);
          if (result.length >= limit) break;
        }
      }
      return result;
    } catch (err) {
      console.error('Unexpected error fetching recent workouts:', err);
      return [];
    }
  },

  
    fetchWorkoutsForMonth: async (userId: string, year: number, month: number, role: 'athlete' | 'coach') => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    let query = supabase
      .from('workouts')
      .select('id, date_prevue, type_seance, status, athlete_id, group_assignment_id, measures')
      .gte('date_prevue', startDate.toISOString())
      .lte('date_prevue', endDate.toISOString());

    if (role === 'coach') {
      query = query.eq('coach_id', userId);
    } else {
      query = query.eq('athlete_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching month workouts:', error);
      return [];
    }

    if (role === 'coach') {
      // One entry per group: an athlete's row (not the coach's hidden master copy), "completed" once every athlete has validated
      const groups = new Map<string, { rep: any; done: number; total: number }>();
      for (const w of (data || [])) {
        const key = w.group_assignment_id || w.id;
        const isMaster = !!w.measures?.is_master;
        const g = groups.get(key) || { rep: null, done: 0, total: 0 };
        if (!isMaster) {
          g.total += 1;
          if (w.status === 'completed') g.done += 1;
        }
        if (!g.rep || (g.rep.measures?.is_master && !isMaster)) g.rep = w;
        groups.set(key, g);
      }
      return Array.from(groups.values()).map(({ rep, done, total }) =>
        total > 0 ? { ...rep, status: done === total ? 'completed' : 'pending' } : rep);
    }

    return (data || []).filter((w: any) => !w.measures?.is_master);
  },

  fetchWorkoutsForDate: async (userId: string, date: Date, role: 'athlete' | 'coach', teamId?: string) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase.from('workouts').select('*');

    if (role === 'athlete') {
      // With the new cloning architecture, every workout assigned to a team or subgroup 
      // is individually copied for the athlete with their athlete_id.
      // Therefore, the RLS policy naturally protects it and we only need this simple equality check.
      query = query.eq('athlete_id', userId);
    } else if (role === 'coach') {
      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        query = query.eq('coach_id', userId);
      }
    }

    query = query
      .gte('date_prevue', startOfDay.toISOString())
      .lte('date_prevue', endOfDay.toISOString())
      .order('date_prevue', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    if (role === 'coach') {
      const groupedMap = new Map<string, any>();
      const progress = new Map<string, { done: number; total: number }>();
      for (const w of (data || [])) {
        const key = w.group_assignment_id || w.id;
        if (!w.measures?.is_master) {
          const p = progress.get(key) || { done: 0, total: 0 };
          p.total += 1;
          if (w.status === 'completed') p.done += 1;
          progress.set(key, p);
        }
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            ...w,
            blocks: Array.isArray(w.blocks) ? [...w.blocks] : [],
            exercises: Array.isArray(w.exercises) ? [...w.exercises] : [],
          });
        } else {
          let existing = groupedMap.get(key);
          if (existing.measures?.is_master) continue; // the master copy already holds the whole session
          if (w.measures?.is_master && !existing.measures?.is_master) {
            // The coach's master copy holds the full session (athlete rows only hold their own part)
            existing = {
              ...w,
              blocks: Array.isArray(w.blocks) ? [...w.blocks] : [],
              exercises: Array.isArray(w.exercises) ? [...w.exercises] : [],
            };
            groupedMap.set(key, existing);
            continue;
          }
          const existingBlockKeys = new Set(
            (existing.blocks || []).map((b: any) => b.id || b.name)
          );
          for (const blk of (w.blocks || [])) {
            const blkKey = blk.id || blk.name;
            if (!existingBlockKeys.has(blkKey)) {
              existingBlockKeys.add(blkKey);
              existing.blocks.push(blk);
            }
          }

          const existingExKeys = new Set(
            (existing.exercises || []).map((e: any) => e.id || e.name)
          );
          for (const ex of (w.exercises || [])) {
            const exKey = ex.id || ex.name;
            if (!existingExKeys.has(exKey)) {
              existingExKeys.add(exKey);
              existing.exercises.push(ex);
            }
          }
        }
      }
      return Array.from(groupedMap.entries()).map(([key, w]) => {
        const p = progress.get(key);
        if (!p) return w;
        // The coach card stands for the whole group: validated only once every athlete has validated
        return { ...w, status: p.total > 0 && p.done === p.total ? 'completed' : 'pending', done_count: p.done, athlete_count: p.total };
      });
    }

    return (data || []).filter((w: any) => !w.measures?.is_master);
  },

  submitWorkoutResults: async (workoutId: string, efforts: any[], measures?: any) => {
    const { error } = await supabase.rpc('submit_workout_results', {
      p_workout_id: workoutId,
      p_efforts: efforts,
      p_measures: measures || null,
    });
    if (error) throw error;
  },

  completeWorkout: async (workoutId: string) => {
    const { error } = await supabase
      .rpc('complete_workout', { p_workout_id: workoutId });

    if (error) throw error;
    return [{ id: workoutId, status: 'completed' }]; 
  },

  deleteWorkout: async (workoutId: string, groupAssignmentId?: string | null) => {
    if (groupAssignmentId) {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('group_assignment_id', groupAssignmentId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);
      if (error) throw error;
    }
    return true;
  },

  fetchRecentWorkoutsContext: async (athleteId: string, days: number = 7) => {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const { data, error } = await supabase
      .from('workouts')
      .select('type_seance, status, created_at, athlete_efforts(*)')
      .eq('athlete_id', athleteId)
      .gte('created_at', dateLimit.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) return "Aucun entraînement récent.";

    return data.map(w => {
      const efforts = (w.athlete_efforts || []).map((e: any) => {
        const details = [
          e.actual_time_ms ? `${(e.actual_time_ms / 1000).toFixed(2)}s` : null,
          e.actual_weight_kg ? `${e.actual_weight_kg}kg` : null,
          e.actual_reps ? `${e.actual_reps} reps` : null,
          e.actual_distance_m ? `${e.actual_distance_m}m` : null,
        ].filter(Boolean).join(' / ');
        return `   * Série ${e.set_order || 1}: ${details || 'Réalisé'}`;
      }).join('\n');

      return `- ${new Date(w.created_at).toLocaleDateString('fr-FR')}: ${w.type_seance} (${w.status})\n${efforts}`;
    }).join('\n');
  },

  fetchAthletePerformanceHistory: async (athleteId: string) => {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        type_seance,
        description,
        date_prevue,
        status,
        created_at,
        athlete_efforts (
          id,
          set_order,
          block_order,
          exercise_category,
          planned_reps,
          actual_reps,
          planned_weight_kg,
          actual_weight_kg,
          planned_distance_m,
          actual_distance_m,
          planned_time_ms,
          actual_time_ms,
          planned_intensity,
          actual_intensity,
          actual_extra, is_pr
        )
      `)
      .eq('athlete_id', athleteId)
      .order('date_prevue', { ascending: false });

    if (error) {
      console.error('Error fetching athlete performance history:', error);
      throw error;
    }
    return data || [];
  },

  /** Next competition (type_seance 'Compétition') planned for the athlete, from today onward. */
  fetchNextCompetition: async (athleteId: string) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('workouts')
      .select('id, date_prevue, type_seance, description, measures, status')
      .eq('athlete_id', athleteId)
      .ilike('type_seance', 'comp%')
      .gte('date_prevue', startOfToday.toISOString())
      .order('date_prevue', { ascending: true })
      .limit(1);

    if (error) throw error;
    return data?.[0] || null;
  },

  fetchUpcomingCompetitionsContext: async (athleteId: string, days: number = 7) => {
    return "Aucune compétition prévue dans les 7 prochains jours.";
  },

  /**
   * Duplicate a workout to a specific target date.
   * Creates independent copies (not linked to original).
   * If the workout has a group_assignment_id, all athlete copies are duplicated too.
   */
  duplicateWorkout: async (workout: any, targetDate: Date): Promise<void> => {
    // Build the target date ISO string preserving the time
    const originalDate = new Date(workout.date_prevue);
    const target = new Date(targetDate);
    target.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds());

    if (workout.group_assignment_id) {
      // Fetch all workouts belonging to this group assignment
      const allGroupWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(workout.group_assignment_id);
      
      // Generate a new group_assignment_id for the copies
      const newGroupId = generateUUID();
      
      const copies = allGroupWorkouts.map((w: any) => {
        const { id, created_at, updated_at, athlete_efforts, done_count, athlete_count, ...rest } = w;
        return {
          ...rest,
          measures: copyMeasures(rest.measures),
          date_prevue: target.toISOString(),
          status: 'pending',
          group_assignment_id: newGroupId,
        };
      });

      if (copies.length > 0) {
        const { error } = await supabase.from('workouts').insert(copies);
        if (error) throw error;
      }
    } else {
      // Single workout copy
      const { id, created_at, updated_at, athlete_efforts, done_count, athlete_count, ...rest } = workout;
      const copy = {
        ...rest,
        measures: copyMeasures(rest.measures),
        date_prevue: target.toISOString(),
        status: 'pending',
        group_assignment_id: null,
      };

      const { error } = await supabase.from('workouts').insert([copy]);
      if (error) throw error;
    }
  },

  /**
   * Repeat a workout based on frequency and number of occurrences.
   * @param workout - The workout to repeat
   * @param mode - 'daily', 'weekly', 'monthly', 'yearly'
   * @param count - Number of occurrences
   * @returns Number of copies created
   */
  repeatWorkout: async (workout: any, mode: 'daily' | 'weekly' | 'monthly' | 'yearly', requestedCount: number): Promise<number> => {
    const count = Math.max(1, Math.min(365, Math.floor(Number(requestedCount) || 1)));
    const workoutDate = new Date(workout.date_prevue);
    const dates: Date[] = [];

    // Calculate all target dates starting from the next occurrence
    for (let i = 1; i <= count; i++) {
      const targetDate = new Date(workoutDate);
      
      switch (mode) {
        case 'daily':
          targetDate.setDate(targetDate.getDate() + i);
          break;
        case 'weekly':
          targetDate.setDate(targetDate.getDate() + (i * 7));
          break;
        case 'monthly':
          targetDate.setMonth(targetDate.getMonth() + i);
          break;
        case 'yearly':
          targetDate.setFullYear(targetDate.getFullYear() + i);
          break;
      }
      
      dates.push(targetDate);
    }

    if (dates.length === 0) return 0;

    if (workout.group_assignment_id) {
      // Group workout: duplicate all athletes for each date
      const allGroupWorkouts = await workoutService.fetchWorkoutsByGroupAssignment(workout.group_assignment_id);
      
      const allCopies: any[] = [];
      for (const targetDate of dates) {
        const newGroupId = generateUUID();
        for (const w of allGroupWorkouts) {
          const { id, created_at, updated_at, athlete_efforts, done_count, athlete_count, ...rest } = w;
          allCopies.push({
            ...rest,
            measures: copyMeasures(rest.measures),
            date_prevue: targetDate.toISOString(),
            status: 'pending',
            group_assignment_id: newGroupId,
          });
        }
      }

      // Insert in batches of 50 to avoid hitting limits
      for (let i = 0; i < allCopies.length; i += 50) {
        const batch = allCopies.slice(i, i + 50);
        const { error } = await supabase.from('workouts').insert(batch);
        if (error) throw error;
      }

      return dates.length;
    } else {
      // Single workout: one copy per date
      const copies = dates.map(targetDate => {
        const { id, created_at, updated_at, athlete_efforts, done_count, athlete_count, ...rest } = workout;
        return {
          ...rest,
          measures: copyMeasures(rest.measures),
          date_prevue: targetDate.toISOString(),
          status: 'pending',
          group_assignment_id: null,
        };
      });

      for (let i = 0; i < copies.length; i += 50) {
        const batch = copies.slice(i, i + 50);
        const { error } = await supabase.from('workouts').insert(batch);
        if (error) throw error;
      }

      return dates.length;
    }
  },
};

