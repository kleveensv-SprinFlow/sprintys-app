// deno-lint-ignore-file no-explicit-any
export type Role = 'athlete' | 'coach';

export interface Limits {
  planWeeksMax: number;
  plansActive: number;
  /** Free plan: how many Sprinty plans one account may ever create (null = no limit). */
  planLifetimeMax: number | null;
  competitionSearch: boolean;
  /** Plus: weekly report and weekly adjustment of an existing plan. */
  weeklyReport: boolean;
}

export interface AthleteRef {
  id: string;
  name: string;
  firstName: string;
  teamId: string;
  teamName: string;
  subgroupId: string | null;
  subgroupName: string | null;
  disciplines: string[];
}

export interface Ctx {
  supabase: any;
  userId: string;
  role: Role;
  firstName: string;
  gender: 'm' | 'f' | null;
  hasCoach: boolean;
  age: number | null;
  today: string;
  philosophy: string | null;
  limits: Limits;
  focusAthlete: { id: string; name: string } | null;
  /** Coach only, loaded on first use. */
  roster?: { athletes: AthleteRef[]; teams: { id: string; name: string }[]; subgroups: { id: string; name: string; teamId: string }[] };
  emit: (event: Record<string, unknown>) => void;
  /** Test accounts only: tool refusals are streamed back. */
  debug?: boolean;
}

/** Result of a tool: what the model reads back, and whether the turn must end after it. */
export interface ToolResult {
  content: unknown;
  terminal?: boolean;
  /** After a terminal tool, ask the model for one closing sentence (default true). */
  closing?: boolean;
}
