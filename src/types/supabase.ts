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
          group_assignment_id: string | null
          athlete_id: string
          blocks: Json | null
          coach_id: string
          created_at: string | null
          date_prevue: string
          description: string | null
          exercises: Json | null
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
          group_assignment_id?: string | null
          athlete_id: string
          blocks?: Json | null
          coach_id: string
          created_at?: string | null
          date_prevue: string
          description?: string | null
          exercises?: Json | null
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
          group_assignment_id?: string | null
          athlete_id?: string
          blocks?: Json | null
          coach_id?: string
          created_at?: string | null
          date_prevue?: string
          description?: string | null
          exercises?: Json | null
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
      [_ in never]: never
    }
    Functions: {
      assign_workout_to_group: { Args: { p_workout_data: Json; p_team_id?: string; p_subgroup_id?: string }; Returns: string }
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
      is_coach_of_team: { Args: { p_team_id: string }; Returns: boolean }
      is_member_of_team: { Args: { p_team_id: string }; Returns: boolean }
      join_team_by_code: { Args: { p_invite_code: string }; Returns: Json }
      preview_team_by_code: { Args: { p_invite_code: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
