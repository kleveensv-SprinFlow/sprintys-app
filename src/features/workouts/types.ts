export interface CompetitionScheduleItem {
  time: string;
  event: string;
}

export interface Workout {
  id: string;
  user_id: string;
  created_at: string;
  type: 'track' | 'gym' | 'recovery';
  title: string;
  description?: string;
  is_competition: boolean;
  // Specific Competition Fields
  city?: string;
  competition_schedule?: CompetitionScheduleItem[];
  competition_time?: string; // Standardized race time (HH:mm)
  call_room_time?: string; // Call room entry (HH:mm)
  warmup_duration?: number; // In minutes, default 60-90
  // Performance results (added later by debrief)
  results?: any;
}
