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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_access_keys: {
        Row: {
          athlete_id: string
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          scopes: string[]
          use_count: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          use_count?: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
          use_count?: number
        }
        Relationships: []
      }
      ai_access_log: {
        Row: {
          athlete_id: string
          id: number
          key_id: string
          scopes: string[]
          used_at: string
        }
        Insert: {
          athlete_id: string
          id?: never
          key_id: string
          scopes?: string[]
          used_at?: string
        }
        Update: {
          athlete_id?: string
          id?: never
          key_id?: string
          scopes?: string[]
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_access_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "ai_access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_notes: {
        Row: {
          athlete_id: string
          categorie: string
          created_at: string
          id: string
          key_id: string | null
          source: string
          texte: string
        }
        Insert: {
          athlete_id: string
          categorie: string
          created_at?: string
          id?: string
          key_id?: string | null
          source?: string
          texte: string
        }
        Update: {
          athlete_id?: string
          categorie?: string
          created_at?: string
          id?: string
          key_id?: string | null
          source?: string
          texte?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_notes_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "ai_access_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_plans: {
        Row: {
          athlete_id: string
          created_at: string
          end_date: string
          goal_id: string | null
          id: string
          safety: Json
          start_date: string
          status: string
          title: string
          weeks: number
        }
        Insert: {
          athlete_id: string
          created_at?: string
          end_date: string
          goal_id?: string | null
          id?: string
          safety?: Json
          start_date: string
          status?: string
          title: string
          weeks: number
        }
        Update: {
          athlete_id?: string
          created_at?: string
          end_date?: string
          goal_id?: string | null
          id?: string
          safety?: Json
          start_date?: string
          status?: string
          title?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_plans_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "athlete_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          day: string
          meal_requests: number
          photo_requests: number
          requests: number
          scan_requests: number
          text_requests: number
          tokens: number
          user_id: string
        }
        Insert: {
          day: string
          meal_requests?: number
          photo_requests?: number
          requests?: number
          scan_requests?: number
          text_requests?: number
          tokens?: number
          user_id: string
        }
        Update: {
          day?: string
          meal_requests?: number
          photo_requests?: number
          requests?: number
          scan_requests?: number
          text_requests?: number
          tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
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
          hidden_from_records: boolean
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
          hidden_from_records?: boolean
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
          hidden_from_records?: boolean
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
            foreignKeyName: "athlete_efforts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_goals: {
        Row: {
          athlete_id: string
          availability: Json
          constraints: Json
          created_at: string
          event_date: string | null
          id: string
          level: string | null
          status: string
          target: string | null
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          availability?: Json
          constraints?: Json
          created_at?: string
          event_date?: string | null
          id?: string
          level?: string | null
          status?: string
          target?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          availability?: Json
          constraints?: Json
          created_at?: string
          event_date?: string | null
          id?: string
          level?: string | null
          status?: string
          target?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      athlete_maxes: {
        Row: {
          athlete_id: string
          exercise_key: string
          label: string
          one_rm_kg: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          athlete_id: string
          exercise_key: string
          label: string
          one_rm_kg: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          athlete_id?: string
          exercise_key?: string
          label?: string
          one_rm_kg?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      body_metrics: {
        Row: {
          athlete_id: string | null
          body_fat: number | null
          created_at: string | null
          fat_mass_kg: number | null
          id: string
          muscle_mass_kg: number | null
          muscle_mass_percent: number | null
          scale_type: string | null
          visceral_fat: number | null
          water_percentage: number | null
          weight: number
        }
        Insert: {
          athlete_id?: string | null
          body_fat?: number | null
          created_at?: string | null
          fat_mass_kg?: number | null
          id?: string
          muscle_mass_kg?: number | null
          muscle_mass_percent?: number | null
          scale_type?: string | null
          visceral_fat?: number | null
          water_percentage?: number | null
          weight: number
        }
        Update: {
          athlete_id?: string | null
          body_fat?: number | null
          created_at?: string | null
          fat_mass_kg?: number | null
          id?: string
          muscle_mass_kg?: number | null
          muscle_mass_percent?: number | null
          scale_type?: string | null
          visceral_fat?: number | null
          water_percentage?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_metrics_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          athlete_id: string
          bedtime: string | null
          created_at: string | null
          date: string
          fatigue_level: number | null
          health_score: number | null
          id: string
          mental_score: number | null
          motivation_level: number | null
          pains: Json | null
          physical_score: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          sleep_score: number | null
          stress_level: number | null
          wakeup_time: string | null
        }
        Insert: {
          athlete_id: string
          bedtime?: string | null
          created_at?: string | null
          date?: string
          fatigue_level?: number | null
          health_score?: number | null
          id?: string
          mental_score?: number | null
          motivation_level?: number | null
          pains?: Json | null
          physical_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          stress_level?: number | null
          wakeup_time?: string | null
        }
        Update: {
          athlete_id?: string
          bedtime?: string | null
          created_at?: string | null
          date?: string
          fatigue_level?: number | null
          health_score?: number | null
          id?: string
          mental_score?: number | null
          motivation_level?: number | null
          pains?: Json | null
          physical_score?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sleep_score?: number | null
          stress_level?: number | null
          wakeup_time?: string | null
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
      ciqual_foods: {
        Row: {
          calcium: number | null
          code_ciqual: string
          created_at: string | null
          eau: number | null
          energie_kcal: number
          etat: string | null
          fer: number | null
          fibres: number
          glucides: number
          id: string
          lipides: number
          nom: string
          proteines: number
          search_text: string | null
          sodium: number | null
          synonymes: string | null
          updated_at: string | null
          vitamine_c: number | null
        }
        Insert: {
          calcium?: number | null
          code_ciqual: string
          created_at?: string | null
          eau?: number | null
          energie_kcal?: number
          etat?: string | null
          fer?: number | null
          fibres?: number
          glucides?: number
          id?: string
          lipides?: number
          nom: string
          proteines?: number
          search_text?: string | null
          sodium?: number | null
          synonymes?: string | null
          updated_at?: string | null
          vitamine_c?: number | null
        }
        Update: {
          calcium?: number | null
          code_ciqual?: string
          created_at?: string | null
          eau?: number | null
          energie_kcal?: number
          etat?: string | null
          fer?: number | null
          fibres?: number
          glucides?: number
          id?: string
          lipides?: number
          nom?: string
          proteines?: number
          search_text?: string | null
          sodium?: number | null
          synonymes?: string | null
          updated_at?: string | null
          vitamine_c?: number | null
        }
        Relationships: []
      }
      coach_ai_memory: {
        Row: {
          category: string
          coach_id: string
          content: string
          created_at: string
          id: string
          source: string
          updated_at: string
        }
        Insert: {
          category?: string
          coach_id: string
          content: string
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
        }
        Update: {
          category?: string
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
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
          muted: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_message_id?: string | null
          muted?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_message_id?: string | null
          muted?: boolean
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
          pinned_at: string | null
          pinned_by: string | null
          pinned_message_id: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_message_id?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned_at?: string | null
          pinned_by?: string | null
          pinned_message_id?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
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
      food_master: {
        Row: {
          ag_monoinsatures_g: number
          ag_polyinsatures_g: number
          ag_satures_g: number
          alerte_coherence: boolean
          calcium_mg: number
          cuivre_mg: number
          display_name: string
          donnees_pauvres: boolean
          eau_g: number
          etat: string | null
          facteur_cuisson: number | null
          facteur_source: string | null
          fer_mg: number
          fibres_g: number
          glucides_g: number
          groupe: string | null
          id: string
          iode_ug: number
          kcal: number
          kcal_source: string | null
          lipides_g: number
          magnesium_mg: number
          manganese_mg: number
          micros_manquants: number
          nom_origine: string
          omega3_g: number
          omega6_g: number
          phosphore_mg: number
          poids_moyen_g: number
          popularite: number
          portion_source: string | null
          potassium_mg: number
          proteines_g: number
          search_priority: number
          search_tags: string
          sel_g: number
          selenium_ug: number
          sodium_mg: number
          source: string
          source_id: string
          sous_groupe: string | null
          sucres_g: number
          unite_label: string
          vitamine_a_ug: number
          vitamine_b1_mg: number
          vitamine_b12_ug: number
          vitamine_b2_mg: number
          vitamine_b3_mg: number
          vitamine_b5_mg: number
          vitamine_b6_mg: number
          vitamine_b9_ug: number
          vitamine_c_mg: number
          vitamine_d_ug: number
          vitamine_e_mg: number
          vitamine_k1_ug: number
          zinc_mg: number
        }
        Insert: {
          ag_monoinsatures_g?: number
          ag_polyinsatures_g?: number
          ag_satures_g?: number
          alerte_coherence?: boolean
          calcium_mg?: number
          cuivre_mg?: number
          display_name: string
          donnees_pauvres?: boolean
          eau_g?: number
          etat?: string | null
          facteur_cuisson?: number | null
          facteur_source?: string | null
          fer_mg?: number
          fibres_g?: number
          glucides_g?: number
          groupe?: string | null
          id: string
          iode_ug?: number
          kcal?: number
          kcal_source?: string | null
          lipides_g?: number
          magnesium_mg?: number
          manganese_mg?: number
          micros_manquants?: number
          nom_origine: string
          omega3_g?: number
          omega6_g?: number
          phosphore_mg?: number
          poids_moyen_g?: number
          popularite?: number
          portion_source?: string | null
          potassium_mg?: number
          proteines_g?: number
          search_priority: number
          search_tags?: string
          sel_g?: number
          selenium_ug?: number
          sodium_mg?: number
          source: string
          source_id: string
          sous_groupe?: string | null
          sucres_g?: number
          unite_label?: string
          vitamine_a_ug?: number
          vitamine_b1_mg?: number
          vitamine_b12_ug?: number
          vitamine_b2_mg?: number
          vitamine_b3_mg?: number
          vitamine_b5_mg?: number
          vitamine_b6_mg?: number
          vitamine_b9_ug?: number
          vitamine_c_mg?: number
          vitamine_d_ug?: number
          vitamine_e_mg?: number
          vitamine_k1_ug?: number
          zinc_mg?: number
        }
        Update: {
          ag_monoinsatures_g?: number
          ag_polyinsatures_g?: number
          ag_satures_g?: number
          alerte_coherence?: boolean
          calcium_mg?: number
          cuivre_mg?: number
          display_name?: string
          donnees_pauvres?: boolean
          eau_g?: number
          etat?: string | null
          facteur_cuisson?: number | null
          facteur_source?: string | null
          fer_mg?: number
          fibres_g?: number
          glucides_g?: number
          groupe?: string | null
          id?: string
          iode_ug?: number
          kcal?: number
          kcal_source?: string | null
          lipides_g?: number
          magnesium_mg?: number
          manganese_mg?: number
          micros_manquants?: number
          nom_origine?: string
          omega3_g?: number
          omega6_g?: number
          phosphore_mg?: number
          poids_moyen_g?: number
          popularite?: number
          portion_source?: string | null
          potassium_mg?: number
          proteines_g?: number
          search_priority?: number
          search_tags?: string
          sel_g?: number
          selenium_ug?: number
          sodium_mg?: number
          source?: string
          source_id?: string
          sous_groupe?: string | null
          sucres_g?: number
          unite_label?: string
          vitamine_a_ug?: number
          vitamine_b1_mg?: number
          vitamine_b12_ug?: number
          vitamine_b2_mg?: number
          vitamine_b3_mg?: number
          vitamine_b5_mg?: number
          vitamine_b6_mg?: number
          vitamine_b9_ug?: number
          vitamine_c_mg?: number
          vitamine_d_ug?: number
          vitamine_e_mg?: number
          vitamine_k1_ug?: number
          zinc_mg?: number
        }
        Relationships: []
      }
      group_sponsorships: {
        Row: {
          coach_id: string
          created_at: string
          team_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          team_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_sponsorships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          calories: number
          consumed_at: string
          created_at: string | null
          custom_food_name: string | null
          food_id: string | null
          glucides: number
          grams_per_unit: number | null
          id: string
          input_qty: number | null
          input_unit: string | null
          lipides: number
          meal_type: string
          micros: Json | null
          proteines: number
          quantity_g: number
          unit_label: string | null
          user_id: string | null
        }
        Insert: {
          calories: number
          consumed_at?: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          glucides: number
          grams_per_unit?: number | null
          id?: string
          input_qty?: number | null
          input_unit?: string | null
          lipides: number
          meal_type: string
          micros?: Json | null
          proteines: number
          quantity_g: number
          unit_label?: string | null
          user_id?: string | null
        }
        Update: {
          calories?: number
          consumed_at?: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          glucides?: number
          grams_per_unit?: number | null
          id?: string
          input_qty?: number | null
          input_unit?: string | null
          lipides?: number
          meal_type?: string
          micros?: Json | null
          proteines?: number
          quantity_g?: number
          unit_label?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      message_likes: {
        Row: {
          created_at: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          reaction?: string
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
      plan_limits: {
        Row: {
          adaptive_target: boolean
          ai_plan_lifetime_max: number | null
          ai_plan_weeks_max: number
          ai_plans_active: number
          competition_search: boolean
          meal_ai_per_day: number
          pdf_export: boolean
          photo_per_day: number
          photo_text_per_week: number | null
          plan: string
          scan_per_day: number
          smart_vision: boolean
          sponsored_athletes: number
          sponsored_groups: number
          sprinty_per_day: number
          sprinty_per_week: number | null
          text_per_day: number
          weekly_report: boolean
        }
        Insert: {
          adaptive_target?: boolean
          ai_plan_lifetime_max?: number | null
          ai_plan_weeks_max?: number
          ai_plans_active?: number
          competition_search?: boolean
          meal_ai_per_day: number
          pdf_export?: boolean
          photo_per_day?: number
          photo_text_per_week?: number | null
          plan: string
          scan_per_day?: number
          smart_vision?: boolean
          sponsored_athletes?: number
          sponsored_groups?: number
          sprinty_per_day: number
          sprinty_per_week?: number | null
          text_per_day?: number
          weekly_report?: boolean
        }
        Update: {
          adaptive_target?: boolean
          ai_plan_lifetime_max?: number | null
          ai_plan_weeks_max?: number
          ai_plans_active?: number
          competition_search?: boolean
          meal_ai_per_day?: number
          pdf_export?: boolean
          photo_per_day?: number
          photo_text_per_week?: number | null
          plan?: string
          scan_per_day?: number
          smart_vision?: boolean
          sponsored_athletes?: number
          sponsored_groups?: number
          sprinty_per_day?: number
          sprinty_per_week?: number | null
          text_per_day?: number
          weekly_report?: boolean
        }
        Relationships: []
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
          avatar_url: string | null
          created_at: string | null
          current_flow_streak: number | null
          date_of_birth: string | null
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
          sprinty_intro_status: string | null
          start_weight: number | null
          subgroups: string[] | null
          target_weight: number | null
          updated_at: string | null
          weekly_weight_goal: number | null
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          avatar_url?: string | null
          created_at?: string | null
          current_flow_streak?: number | null
          date_of_birth?: string | null
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
          sprinty_intro_status?: string | null
          start_weight?: number | null
          subgroups?: string[] | null
          target_weight?: number | null
          updated_at?: string | null
          weekly_weight_goal?: number | null
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          avatar_url?: string | null
          created_at?: string | null
          current_flow_streak?: number | null
          date_of_birth?: string | null
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
          sprinty_intro_status?: string | null
          start_weight?: number | null
          subgroups?: string[] | null
          target_weight?: number | null
          updated_at?: string | null
          weekly_weight_goal?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          body: string
          claimed_at: string | null
          created_at: string
          data: Json
          error: string | null
          id: number
          kind: string
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          claimed_at?: string | null
          created_at?: string
          data?: Json
          error?: string | null
          id?: number
          kind: string
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          claimed_at?: string | null
          created_at?: string
          data?: Json
          error?: string | null
          id?: number
          kind?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
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
          micros: Json | null
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
          micros?: Json | null
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
          micros?: Json | null
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
      subscriptions: {
        Row: {
          current_period_end: string | null
          last_event_ms: number
          plan: string
          product_id: string
          source: string
          status: string
          store: string | null
          updated_at: string
          user_id: string
          will_renew: boolean
        }
        Insert: {
          current_period_end?: string | null
          last_event_ms?: number
          plan: string
          product_id: string
          source?: string
          status?: string
          store?: string | null
          updated_at?: string
          user_id: string
          will_renew?: boolean
        }
        Update: {
          current_period_end?: string | null
          last_event_ms?: number
          plan?: string
          product_id?: string
          source?: string
          status?: string
          store?: string | null
          updated_at?: string
          user_id?: string
          will_renew?: boolean
        }
        Relationships: []
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
      tts_usage: {
        Row: {
          chars: number
          day: string
          user_id: string
        }
        Insert: {
          chars?: number
          day?: string
          user_id: string
        }
        Update: {
          chars?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_text: string
          consent_type: string
          created_at: string | null
          id: string
          ip_address: string | null
          revoked_at: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_text: string
          consent_type: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_text?: string
          consent_type?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      user_nutrition_logs: {
        Row: {
          consumed_at: string
          created_at: string | null
          custom_food_name: string | null
          food_id: string | null
          id: string
          quantity_g: number
          total_glucides: number
          total_kcal: number
          total_lipides: number
          total_proteines: number
          user_id: string | null
        }
        Insert: {
          consumed_at: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          id?: string
          quantity_g: number
          total_glucides?: number
          total_kcal?: number
          total_lipides?: number
          total_proteines?: number
          user_id?: string | null
        }
        Update: {
          consumed_at?: string
          created_at?: string | null
          custom_food_name?: string | null
          food_id?: string | null
          id?: string
          quantity_g?: number
          total_glucides?: number
          total_kcal?: number
          total_lipides?: number
          total_proteines?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_nutrition_logs_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "ciqual_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          message_id: string | null
          reason: string | null
          reported_user_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_id?: string | null
          reason?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
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
          ai_plan_id: string | null
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
          source: string
          status: string | null
          subgroup_id: string | null
          team_id: string | null
          type_seance: string
          updated_at: string | null
        }
        Insert: {
          ai_plan_id?: string | null
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
          source?: string
          status?: string | null
          subgroup_id?: string | null
          team_id?: string | null
          type_seance: string
          updated_at?: string | null
        }
        Update: {
          ai_plan_id?: string | null
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
          source?: string
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
      _ai_is_minor: { Args: { p_uid: string }; Returns: boolean }
      _ai_key_consume: { Args: { p_key: string }; Returns: Json }
      _ai_minor_scopes: { Args: never; Returns: string[] }
      _ai_note_add: {
        Args: { p_categorie: string; p_key_id: string; p_texte: string }
        Returns: Json
      }
      _ai_note_delete: {
        Args: { p_key_id: string; p_note_id: string }
        Returns: boolean
      }
      _ai_scopes_valid: { Args: { p_scopes: string[] }; Returns: boolean }
      _athlete_has_coach: { Args: { p_uid: string }; Returns: boolean }
      _billing_enabled: { Args: never; Returns: boolean }
      _can_view_athlete: { Args: { p_athlete: string }; Returns: boolean }
      _checkin_strong_pain: { Args: { p_pains: Json }; Returns: Json }
      _effective_sub: { Args: { p_uid: string }; Returns: string }
      _effort_exercise_key: {
        Args: { e: Database["public"]["Tables"]["athlete_efforts"]["Row"] }
        Returns: string
      }
      _effort_is_pr: {
        Args: { e: Database["public"]["Tables"]["athlete_efforts"]["Row"] }
        Returns: boolean
      }
      _effort_label: {
        Args: { e: Database["public"]["Tables"]["athlete_efforts"]["Row"] }
        Returns: string
      }
      _effort_weight: {
        Args: { e: Database["public"]["Tables"]["athlete_efforts"]["Row"] }
        Returns: number
      }
      _metadata_birth_date: { Args: { p_meta: Json }; Returns: string }
      _pain_zone_label: { Args: { pn: Json }; Returns: string }
      _paris_week_start: { Args: never; Returns: string }
      _perf_efforts: {
        Args: { p_athlete: string; p_viewer: string }
        Returns: {
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
          hidden_from_records: boolean
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
        }[]
        SetofOptions: {
          from: "*"
          to: "athlete_efforts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      _push_enqueue: {
        Args: {
          p_body: string
          p_data: Json
          p_kind: string
          p_title: string
          p_user: string
        }
        Returns: undefined
      }
      _push_on: { Args: never; Returns: boolean }
      _sponsor_for: {
        Args: { p_uid: string }
        Returns: {
          coach_id: string
          coach_name: string
        }[]
      }
      _target_applies: {
        Args: { p_athlete: string; p_sub: string; tg: Json }
        Returns: boolean
      }
      add_ai_tokens: { Args: { p_tokens: number }; Returns: undefined }
      ai_access_allowed_scopes: { Args: never; Returns: string[] }
      assign_workout_to_group: {
        Args: {
          p_subgroup_id?: string
          p_team_id?: string
          p_workout_data: Json
        }
        Returns: string
      }
      can_access_conversation: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      coach_sponsorship_status: { Args: never; Returns: Json }
      complete_workout: { Args: { p_workout_id: string }; Returns: undefined }
      consume_ai_quota: { Args: { p_limit: number }; Returns: boolean }
      consume_ai_quota_plan: { Args: { p_kind: string }; Returns: Json }
      consume_feature: { Args: { p_kind: string }; Returns: Json }
      consume_tts_chars: { Args: { p_chars: number }; Returns: Json }
      create_ai_access_key: {
        Args: { p_days?: number; p_label: string; p_scopes: string[] }
        Returns: Json
      }
      food_master_search_text: {
        Args: { p_display: string; p_tags: string }
        Returns: string
      }
      get_athlete_group_discussions: {
        Args: { p_coach_id: string; p_team_id: string }
        Returns: Json
      }
      get_athlete_maxes: { Args: { p_athlete: string }; Returns: Json }
      get_athlete_performance: {
        Args: { p_athlete: string; p_weeks?: number }
        Returns: Json
      }
      get_my_plan: { Args: never; Returns: Json }
      get_my_plan_full: { Args: never; Returns: Json }
      get_or_create_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: Json
      }
      get_or_create_team_conversation: {
        Args: { p_team_id: string }
        Returns: Json
      }
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
      get_previous_results: {
        Args: { p_athlete: string; p_workout: string }
        Returns: Json
      }
      get_team_alerts: { Args: { p_team: string }; Returns: Json }
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
      i_have_coach: { Args: never; Returns: boolean }
      is_coach_of_team:
        | { Args: { p_team_id: string }; Returns: boolean }
        | { Args: { p_coach_id: string; p_team_id: string }; Returns: boolean }
      is_member_of_team:
        | { Args: { p_team_id: string }; Returns: boolean }
        | { Args: { p_team_id: string; p_user_id: string }; Returns: boolean }
      join_team_by_code: { Args: { p_invite_code: string }; Returns: Json }
      list_ai_access_keys: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          key_prefix: string
          label: string
          last_used_at: string
          revoked_at: string
          scopes: string[]
          use_count: number
        }[]
      }
      list_ai_access_log: {
        Args: { p_limit?: number }
        Returns: {
          key_label: string
          scopes: string[]
          used_at: string
        }[]
      }
      my_push_devices: { Args: never; Returns: Json }
      pin_conversation_message: {
        Args: { p_conversation_id: string; p_message_id: string }
        Returns: Json
      }
      preview_team_by_code: { Args: { p_invite_code: string }; Returns: string }
      push_dispatch: { Args: never; Returns: undefined }
      register_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      restore_hidden_efforts: { Args: { p_athlete: string }; Returns: number }
      revoke_ai_access_key: { Args: { p_id: string }; Returns: undefined }
      search_foods: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          ag_monoinsatures_g: number
          ag_polyinsatures_g: number
          ag_satures_g: number
          alerte_coherence: boolean
          calcium_mg: number
          cuivre_mg: number
          display_name: string
          donnees_pauvres: boolean
          eau_g: number
          etat: string | null
          facteur_cuisson: number | null
          facteur_source: string | null
          fer_mg: number
          fibres_g: number
          glucides_g: number
          groupe: string | null
          id: string
          iode_ug: number
          kcal: number
          kcal_source: string | null
          lipides_g: number
          magnesium_mg: number
          manganese_mg: number
          micros_manquants: number
          nom_origine: string
          omega3_g: number
          omega6_g: number
          phosphore_mg: number
          poids_moyen_g: number
          popularite: number
          portion_source: string | null
          potassium_mg: number
          proteines_g: number
          search_priority: number
          search_tags: string
          sel_g: number
          selenium_ug: number
          sodium_mg: number
          source: string
          source_id: string
          sous_groupe: string | null
          sucres_g: number
          unite_label: string
          vitamine_a_ug: number
          vitamine_b1_mg: number
          vitamine_b12_ug: number
          vitamine_b2_mg: number
          vitamine_b3_mg: number
          vitamine_b5_mg: number
          vitamine_b6_mg: number
          vitamine_b9_ug: number
          vitamine_c_mg: number
          vitamine_d_ug: number
          vitamine_e_mg: number
          vitamine_k1_ug: number
          zinc_mg: number
        }[]
        SetofOptions: {
          from: "*"
          to: "food_master"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_athlete_max: {
        Args: {
          p_athlete: string
          p_key: string
          p_kg: number
          p_label: string
        }
        Returns: undefined
      }
      set_coach_feedback: {
        Args: { p_text: string; p_workout: string }
        Returns: Json
      }
      set_effort_hidden: {
        Args: { p_effort: string; p_hidden: boolean }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_workout_results: {
        Args: { p_efforts: Json; p_measures?: Json; p_workout_id: string }
        Returns: undefined
      }
      sync_athlete_group_workouts: {
        Args: {
          p_athlete_id: string
          p_subgroup_id?: string
          p_team_id: string
        }
        Returns: number
      }
      unaccent: { Args: { "": string }; Returns: string }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      update_ai_access_key_scopes: {
        Args: { p_id: string; p_scopes: string[] }
        Returns: undefined
      }
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
