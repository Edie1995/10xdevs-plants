export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      care_log: {
        Row: {
          action_type: Database["public"]["Enums"]["care_action_type"];
          created_at: string;
          id: string;
          performed_at: string;
          plant_card_id: string;
          updated_at: string;
        };
        Insert: {
          action_type: Database["public"]["Enums"]["care_action_type"];
          created_at?: string;
          id?: string;
          performed_at: string;
          plant_card_id: string;
          updated_at?: string;
        };
        Update: {
          action_type?: Database["public"]["Enums"]["care_action_type"];
          created_at?: string;
          id?: string;
          performed_at?: string;
          plant_card_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "care_log_plant_card_id_fkey";
            columns: ["plant_card_id"];
            isOneToOne: false;
            referencedRelation: "plant_card";
            referencedColumns: ["id"];
          },
        ];
      };
      disease_entry: {
        Row: {
          advice: string | null;
          created_at: string;
          id: string;
          name: string;
          plant_card_id: string;
          symptoms: string | null;
          updated_at: string;
        };
        Insert: {
          advice?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          plant_card_id: string;
          symptoms?: string | null;
          updated_at?: string;
        };
        Update: {
          advice?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          plant_card_id?: string;
          symptoms?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disease_entry_plant_card_id_fkey";
            columns: ["plant_card_id"];
            isOneToOne: false;
            referencedRelation: "plant_card";
            referencedColumns: ["id"];
          },
        ];
      };
      plant_card: {
        Row: {
          color_hex: string | null;
          created_at: string;
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null;
          icon_key: string | null;
          id: string;
          last_fertilized_at: string | null;
          last_watered_at: string | null;
          name: string;
          next_care_at: string | null;
          next_fertilizing_at: string | null;
          next_watering_at: string | null;
          notes: string | null;
          position: string | null;
          pot: string | null;
          propagation_instructions: string | null;
          repotting_instructions: string | null;
          soil: string | null;
          updated_at: string;
          user_id: string;
          watering_instructions: string | null;
        };
        Insert: {
          color_hex?: string | null;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null;
          icon_key?: string | null;
          id?: string;
          last_fertilized_at?: string | null;
          last_watered_at?: string | null;
          name: string;
          next_fertilizing_at?: string | null;
          next_watering_at?: string | null;
          notes?: string | null;
          position?: string | null;
          pot?: string | null;
          propagation_instructions?: string | null;
          repotting_instructions?: string | null;
          soil?: string | null;
          updated_at?: string;
          user_id: string;
          watering_instructions?: string | null;
        };
        Update: {
          color_hex?: string | null;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null;
          icon_key?: string | null;
          id?: string;
          last_fertilized_at?: string | null;
          last_watered_at?: string | null;
          name?: string;
          next_fertilizing_at?: string | null;
          next_watering_at?: string | null;
          notes?: string | null;
          position?: string | null;
          pot?: string | null;
          propagation_instructions?: string | null;
          repotting_instructions?: string | null;
          soil?: string | null;
          updated_at?: string;
          user_id?: string;
          watering_instructions?: string | null;
        };
        Relationships: [];
      };
      seasonal_schedule: {
        Row: {
          created_at: string;
          fertilizing_interval: number;
          id: string;
          plant_card_id: string;
          season: Database["public"]["Enums"]["season"];
          updated_at: string;
          watering_interval: number;
        };
        Insert: {
          created_at?: string;
          fertilizing_interval: number;
          id?: string;
          plant_card_id: string;
          season: Database["public"]["Enums"]["season"];
          updated_at?: string;
          watering_interval: number;
        };
        Update: {
          created_at?: string;
          fertilizing_interval?: number;
          id?: string;
          plant_card_id?: string;
          season?: Database["public"]["Enums"]["season"];
          updated_at?: string;
          watering_interval?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seasonal_schedule_plant_card_id_fkey";
            columns: ["plant_card_id"];
            isOneToOne: false;
            referencedRelation: "plant_card";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      care_action_type: "watering" | "fertilizing";
      difficulty_level: "easy" | "medium" | "hard";
      season: "spring" | "summer" | "autumn" | "winter";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      care_action_type: ["watering", "fertilizing"],
      difficulty_level: ["easy", "medium", "hard"],
      season: ["spring", "summer", "autumn", "winter"],
    },
  },
} as const;
