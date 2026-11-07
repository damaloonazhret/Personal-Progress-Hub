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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          area_id: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_user_fkey"
            columns: ["user_id", "area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      recurrence_rules: {
        Row: {
          area_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          generate_from: string
          id: string
          interval_count: number
          priority: string
          project_id: string | null
          start_date: string
          status: string
          title: string
          unit: string
          updated_at: string
          user_id: string
          weekdays: number[]
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          generate_from: string
          id?: string
          interval_count: number
          priority?: string
          project_id?: string | null
          start_date: string
          status?: string
          title: string
          unit: string
          updated_at?: string
          user_id: string
          weekdays?: number[]
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          generate_from?: string
          id?: string
          interval_count?: number
          priority?: string
          project_id?: string | null
          start_date?: string
          status?: string
          title?: string
          unit?: string
          updated_at?: string
          user_id?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_area_user_fkey"
            columns: ["user_id", "area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "recurrence_rules_project_area_user_fkey"
            columns: ["user_id", "project_id", "area_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id", "area_id"]
          },
        ]
      }
      recurrence_skips: {
        Row: {
          created_at: string
          occurrence_date: string
          rule_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          occurrence_date: string
          rule_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          occurrence_date?: string
          rule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_skips_rule_user_fkey"
            columns: ["user_id", "rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
      task_templates: {
        Row: {
          area_id: string | null
          created_at: string
          description: string | null
          id: string
          position: number
          priority: string
          project_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_area_user_fkey"
            columns: ["user_id", "area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "task_templates_project_area_user_fkey"
            columns: ["user_id", "project_id", "area_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id", "area_id"]
          },
        ]
      }
      tasks: {
        Row: {
          area_id: string | null
          completed_at: string | null
          created_at: string
          day_position: number | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          project_id: string | null
          recurrence_occurrence_date: string | null
          recurrence_rule_id: string | null
          scheduled_date: string | null
          status: string
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          day_position?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          recurrence_occurrence_date?: string | null
          recurrence_rule_id?: string | null
          scheduled_date?: string | null
          status?: string
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          completed_at?: string | null
          created_at?: string
          day_position?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          recurrence_occurrence_date?: string | null
          recurrence_rule_id?: string | null
          scheduled_date?: string | null
          status?: string
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_area_user_fkey"
            columns: ["user_id", "area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_project_area_user_fkey"
            columns: ["user_id", "project_id", "area_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["user_id", "id", "area_id"]
          },
          {
            foreignKeyName: "tasks_recurrence_rule_user_fkey"
            columns: ["user_id", "recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "tasks_template_user_fkey"
            columns: ["user_id", "template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["user_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recurrence_batch: {
        Args: {
          p_from: string
          p_to: string
          p_rule_ids: string[]
        }
        Returns: number
      }
      apply_recurrence_series: {
        Args: {
          p_rule_id: string
          p_title: string
          p_description: string | null
          p_priority: string
          p_area_id: string | null
          p_project_id: string | null
          p_unit: string
          p_interval_count: number
          p_weekdays: number[]
          p_start_date: string
          p_end_date: string | null
        }
        Returns: number
      }
      delete_recurrence_series: {
        Args: {
          p_rule_id: string
        }
        Returns: number
      }
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
