export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athlete_efforts: {
        Row: {
          actual_distance_m: number | null
          actual_extra: Json | null
          actual_height_cm: number | null
          actual_intensity: number | null
          actual_reps: number | null
          actual_rest_ms: number | null
          actual_time_ms: number | null
          actual_weight_kg: number | null
          athlete_id: string
          block_order: number
          date_achieved: string | null
          exercise_catalog_id: string | null
          exercise_category: string | null
          id: string
          is_pr: boolean | null
          notes: string | null
          planned_distance_m: number | null
          planned_extra: Json | null
          planned_height_cm: number | null
          planned_intensity: number | null
          planned_reps: number | null
          planned_rest_ms: number | null
          planned_time_ms: number | null
          planned_weight_kg: number | null
          set_order: number
          workout_id: string
        }
        Insert: {
          actual_distance_m?: number | null
          actual_extra?: Json | null
          actual_height_cm?: number | null
          actual_intensity?: number | null
          actual_reps?: number | null
          actual_rest_ms?: number | null
          actual_time_ms?: number | null
          actual_weight_kg?: number | null
          athlete_id: string
          block_order: number
          date_achieved?: string | null
          exercise_catalog_id?: string | null
          exercise_category?: string | null
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          planned_distance_m?: number | null
          planned_extra?: Json | null
          planned_height_cm?: number | null
          planned_intensity?: number | null
          planned_reps?: number | null
          planned_rest_ms?: number | null
          planned_time_ms?: number | null
          planned_weight_kg?: number | null
          set_order: number
          workout_id: string
        }
        Update: {
          actual_distance_m?: number | null
          actual_extra?: Json | null
          actual_height_cm?: number | null
          actual_intensity?: number | null
          actual_reps?: number | null
          actual_rest_ms?: number | null
          actual_time_ms?: number | null
          actual_weight_kg?: number | null
          athlete_id?: string
          block_order?: number
          date_achieved?: string | null
          exercise_catalog_id?: string | null
          exercise_category?: string | null
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          planned_distance_m?: number | null
          planned_extra?: Json | null
          planned_height_cm?: number | null
          planned_intensity?: number | null
          planned_reps?: number | null
          planned_rest_ms?: number | null
          planned_time_ms?: number | null
          planned_weight_kg?: number | null
          set_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_efforts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_efforts_exercise_catalog_id_fkey"
            columns: ["exercise_catalog_id"]
            isOneToOne: false
            referencedRelation: "exercises_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_efforts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          athlete_id: string
          bedtime: string
          created_at: string | null
          date: string
          fatigue_level: number | null
          health_score: number | null
          id: string
          menstruation: boolean | null
          mental_score: number | null
          motivation_level: number | null
          pains: Json | null
          physical_score: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          sleep_score: number | null
          stress_level: number | null
          wakeup_time: string
        }
        Insert: {
          athlete_id: string
          bedtime: string
          created_at?: string | null
          date?: string
          fatigue_level?: number | null
          health_score?: number | null
          id?: string
          menstruation?: boolean | null
          mental_score?: number | null
          motivation_level?: number | null
          pains?: Json | null
          physical_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          stress_level?: number | null
          wakeup_time: string
        }
        Update: {
          athlete_id?: string
          bedtime?: string
          created_at?: string | null
          date?: string
          fatigue_level?: number | null
          health_score?: number | null
          id?: string
          menstruation?: boolean | null
          mental_score?: number | null
          motivation_level?: number | null
          pains?: Json | null
          physical_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          stress_level?: number | null
          wakeup_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_exercises: {
        Row: {
          category: string
          coach_id: string
          created_at: string | null
          default_reps: number | null
          default_rest_exercise: number | null
          default_rest_sets: number | null
          default_sets: number | null
          default_stairs: number | null
          default_weight: number | null
          default_weight_type: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          coach_id: string
          created_at?: string | null
          default_reps?: number | null
          default_rest_exercise?: number | null
          default_rest_sets?: number | null
          default_sets?: number | null
          default_stairs?: number | null
          default_weight?: number | null
          default_weight_type?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          coach_id?: string
          created_at?: string | null
          default_reps?: number | null
          default_rest_exercise?: number | null
          default_rest_sets?: number | null
          default_sets?: number | null
          default_stairs?: number | null
          default_weight?: number | null
          default_weight_type?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          competition_id: string
          user_id: string
        }
        Insert: {
          competition_id: string
          user_id: string
        }
        Update: {
          competition_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          comp_date: string
          comp_type: string
          created_at: string
          id: string
          location: string
          team_id: string
          title: string
        }
        Insert: {
          comp_date: string
          comp_type: string
          created_at?: string
          id?: string
          location: string
          team_id: string
          title: string
        }
        Update: {
          comp_date?: string
          comp_type?: string
          created_at?: string
          id?: string
          location?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_message_id: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_message_id?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          team_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          category: string | null
          equipment: string | null
          force: string | null
          id: string
          images: string[] | null
          instructions_en: string[] | null
          level: string | null
          mechanic: string | null
          name_en: string
          name_fr: string | null
          primary_muscles: string[] | null
          secondary_muscles: string[] | null
        }
        Insert: {
          category?: string | null
          equipment?: string | null
          force?: string | null
          id?: string
          images?: string[] | null
          instructions_en?: string[] | null
          level?: string | null
          mechanic?: string | null
          name_en: string
          name_fr?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
        }
        Update: {
          category?: string | null
          equipment?: string | null
          force?: string | null
          id?: string
          images?: string[] | null
          instructions_en?: string[] | null
          level?: string | null
          mechanic?: string | null
          name_en?: string
          name_fr?: string | null
          primary_muscles?: string[] | null
          secondary_muscles?: string[] | null
        }
        Relationships: []
      }
      exercises_catalog: {
        Row: {
          description: string | null
          equipment: string | null
          id: string
          name_en: string | null
          name_fr: string
          zones: string[] | null
        }
        Insert: {
          description?: string | null
          equipment?: string | null
          id: string
          name_en?: string | null
          name_fr: string
          zones?: string[] | null
        }
        Update: {
          description?: string | null
          equipment?: string | null
          id?: string
          name_en?: string | null
          name_fr?: string
          zones?: string[] | null
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          calories: number
          consumed_at: string
          created_at: string | null
          custom_food_name: string | null
          food_id: string | null
          glucides: number
          id: string
          lipides: number
          meal_type: string
          proteines: number
          quantity_g: number
          user_id: string | null
        }
        Insert: {
          calories: number
          consumed_at?: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          glucides: number
          id?: string
          lipides: number
          meal_type: string
          proteines: number
          quantity_g: number
          user_id?: string | null
        }
        Update: {
          calories?: number
          consumed_at?: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          glucides?: number
          id?: string
          lipides?: number
          meal_type?: string
          proteines?: number
          quantity_g?: number
          user_id?: string | null
        }
        Relationships: []
      }
      message_likes: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          sender_id: string | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          sender_id?: string | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          message_id: string
          option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          created_at: string | null
          current_flow_streak: number | null
          disciplines: string[] | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          group_name: string | null
          height: number | null
          id: string
          last_flow_date: string | null
          last_name: string | null
          manual_kcal_goal: number | null
          meal_distribution: Json | null
          objective: string | null
          role: string | null
          sleep_goal: number | null
          start_weight: number | null
          subgroups: string[] | null
          target_weight: number | null
          updated_at: string | null
          weekly_weight_goal: number | null
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          created_at?: string | null
          current_flow_streak?: number | null
          disciplines?: string[] | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          group_name?: string | null
          height?: number | null
          id: string
          last_flow_date?: string | null
          last_name?: string | null
          manual_kcal_goal?: number | null
          meal_distribution?: Json | null
          objective?: string | null
          role?: string | null
          sleep_goal?: number | null
          start_weight?: number | null
          subgroups?: string[] | null
          target_weight?: number | null
          updated_at?: string | null
          weekly_weight_goal?: number | null
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          created_at?: string | null
          current_flow_streak?: number | null
          disciplines?: string[] | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          group_name?: string | null
          height?: number | null
          id?: string
          last_flow_date?: string | null
          last_name?: string | null
          manual_kcal_goal?: number | null
          meal_distribution?: Json | null
          objective?: string | null
          role?: string | null
          sleep_goal?: number | null
          start_weight?: number | null
          subgroups?: string[] | null
          target_weight?: number | null
          updated_at?: string | null
          weekly_weight_goal?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      rpc_rate_limits: {
        Row: {
          action: string
          call_count: number | null
          last_called: string | null
          user_id: string
        }
        Insert: {
          action: string
          call_count?: number | null
          last_called?: string | null
          user_id: string
        }
        Update: {
          action?: string
          call_count?: number | null
          last_called?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_meal_items: {
        Row: {
          calories: number
          custom_food_name: string | null
          food_id: string
          glucides: number
          id: string
          lipides: number
          proteines: number
          quantity_g: number
          saved_meal_id: string
        }
        Insert: {
          calories: number
          custom_food_name?: string | null
          food_id: string
          glucides: number
          id?: string
          lipides: number
          proteines: number
          quantity_g: number
          saved_meal_id: string
        }
        Update: {
          calories?: number
          custom_food_name?: string | null
          food_id?: string
          glucides?: number
          id?: string
          lipides?: number
          proteines?: number
          quantity_g?: number
          saved_meal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_meal_items_saved_meal_id_fkey"
            columns: ["saved_meal_id"]
            isOneToOne: false
            referencedRelation: "saved_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_meals: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      subgroups: {
        Row: {
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          status: string
          subgroup_id: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          status?: string
          subgroup_id?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          status?: string
          subgroup_id?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          invite_code: string
          name: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      training_periods: {
        Row: {
          athlete_id: string | null
          coach_id: string
          color: string
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          subgroup_id: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          coach_id: string
          color: string
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          subgroup_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string
          color?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          subgroup_id?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_periods_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_periods_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          blocks: Json | null
          coach_id: string
          created_at: string
          description: string | null
          exercises: Json | null
          id: string
          intensity: number | null
          measures: Json | null
          name: string
          type_seance: string
          updated_at: string
        }
        Insert: {
          blocks?: Json | null
          coach_id: string
          created_at?: string
          description?: string | null
          exercises?: Json | null
          id?: string
          intensity?: number | null
          measures?: Json | null
          name: string
          type_seance: string
          updated_at?: string
        }
        Update: {
          blocks?: Json | null
          coach_id?: string
          created_at?: string
          description?: string | null
          exercises?: Json | null
          id?: string
          intensity?: number | null
          measures?: Json | null
          name?: string
          type_seance?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          athlete_id: string
          blocks: Json | null
          coach_id: string
          created_at: string | null
          date_prevue: string
          description: string | null
          exercises: Json | null
          group_assignment_id: string | null
          id: string
          intensity: number | null
          measures: Json | null
          status: string | null
          subgroup_id: string | null
          team_id: string | null
          type_seance: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          blocks?: Json | null
          coach_id: string
          created_at?: string | null
          date_prevue: string
          description?: string | null
          exercises?: Json | null
          group_assignment_id?: string | null
          id?: string
          intensity?: number | null
          measures?: Json | null
          status?: string | null
          subgroup_id?: string | null
          team_id?: string | null
          type_seance: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          blocks?: Json | null
          coach_id?: string
          created_at?: string | null
          date_prevue?: string
          description?: string | null
          exercises?: Json | null
          group_assignment_id?: string | null
          id?: string
          intensity?: number | null
          measures?: Json | null
          status?: string | null
          subgroup_id?: string | null
          team_id?: string | null
          type_seance?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      athlete_daily_progression: {
        Row: {
          actual_distance_m: number | null
          actual_reps: number | null
          athlete_id: string | null
          daily_best_time_ms: number | null
          daily_max_weight_kg: number | null
          date_achieved: string | null
          exercise_catalog_id: string | null
          exercise_category: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_efforts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_efforts_exercise_catalog_id_fkey"
            columns: ["exercise_catalog_id"]
            isOneToOne: false
            referencedRelation: "exercises_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_prs: {
        Row: {
          actual_distance_m: number | null
          actual_reps: number | null
          athlete_id: string | null
          best_time_ms: number | null
          exercise_catalog_id: string | null
          exercise_category: string | null
          latest_pr_date: string | null
          max_height_cm: number | null
          max_weight_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_efforts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_efforts_exercise_catalog_id_fkey"
            columns: ["exercise_catalog_id"]
            isOneToOne: false
            referencedRelation: "exercises_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_session_stats: {
        Row: {
          adherence_percentage: number | null
          athlete_id: string | null
          avg_intensity: number | null
          total_completed_sets: number | null
          total_distance_m: number | null
          total_planned_sets: number | null
          total_volume_kg: number | null
          type_seance: string | null
          workout_date: string | null
          workout_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_efforts_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_efforts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_workout_to_group: {
        Args: {
          p_subgroup_id?: string
          p_team_id?: string
          p_workout_data: Json
        }
        Returns: string
      }
      complete_workout: { Args: { p_workout_id: string }; Returns: undefined }
      get_pending_members: {
        Args: never
        Returns: {
          profile: Json
          status: string
          subgroup_id: string
          team_id: string
          user_id: string
        }[]
      }
      get_workout_degradation: {
        Args: { p_athlete_id: string; p_limit?: number }
        Returns: {
          best_time_ms: number
          degradation_percentage: number
          distance_m: number
          exercise_category: string
          workout_date: string
          workout_id: string
          worst_time_ms: number
        }[]
      }
      is_coach_of_team: { Args: { p_team_id: string }; Returns: boolean }
      is_member_of_team: { Args: { p_team_id: string }; Returns: boolean }
      join_team_by_code: { Args: { p_invite_code: string }; Returns: Json }
      preview_team_by_code: { Args: { p_invite_code: string }; Returns: string }
      submit_workout_results: {
        Args: { p_efforts: Json; p_measures?: Json; p_workout_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      conversation_type: "team" | "direct"
      message_type: "text" | "poll" | "system"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      conversation_type: ["team", "direct"],
      message_type: ["text", "poll", "system"],
    },
  },
} as const
