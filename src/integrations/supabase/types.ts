export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agent_hospital_assignments: {
        Row: {
          created_at: string;
          hospital_id: string;
          id: string;
          is_active: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hospital_id: string;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hospital_id?: string;
          id?: string;
          is_active?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_hospital_assignments_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      blood_inventory: {
        Row: {
          blood_type: string;
          current_units: number;
          hospital_id: string;
          id: string;
          last_updated: string;
          maximum_capacity: number;
          minimum_threshold: number;
        };
        Insert: {
          blood_type: string;
          current_units?: number;
          hospital_id: string;
          id?: string;
          last_updated?: string;
          maximum_capacity?: number;
          minimum_threshold?: number;
        };
        Update: {
          blood_type?: string;
          current_units?: number;
          hospital_id?: string;
          id?: string;
          last_updated?: string;
          maximum_capacity?: number;
          minimum_threshold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "blood_inventory_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      donation_appointments: {
        Row: {
          appointment_date: string;
          blood_type: string;
          created_at: string;
          donation_status: string | null;
          hospital_id: string;
          id: string;
          notes: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          appointment_date: string;
          blood_type: string;
          created_at?: string;
          donation_status?: string | null;
          hospital_id: string;
          id?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appointment_date?: string;
          blood_type?: string;
          created_at?: string;
          donation_status?: string | null;
          hospital_id?: string;
          id?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donation_appointments_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      donation_trucks: {
        Row: {
          coordinates: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          location: string;
          name: string;
          schedule: string | null;
        };
        Insert: {
          coordinates?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          location: string;
          name: string;
          schedule?: string | null;
        };
        Update: {
          coordinates?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          location?: string;
          name?: string;
          schedule?: string | null;
        };
        Relationships: [];
      };
      donations: {
        Row: {
          units: number;
          blood_type: string;
          created_at: string | null;
          donation_date: string;
          hospital_id: string | null;
          id: string;
          notes: string | null;
          status: string | null;
          truck_id: string | null;
          user_id: string;
        };
        Insert: {
          units: number;
          blood_type: string;
          created_at?: string | null;
          donation_date: string;
          hospital_id?: string | null;
          id?: string;
          notes?: string | null;
          status?: string | null;
          truck_id?: string | null;
          user_id: string;
        };
        Update: {
          units?: number;
          blood_type?: string;
          created_at?: string | null;
          donation_date?: string;
          hospital_id?: string | null;
          id?: string;
          notes?: string | null;
          status?: string | null;
          truck_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "donations_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_truck_id_fkey";
            columns: ["truck_id"];
            isOneToOne: false;
            referencedRelation: "donation_trucks";
            referencedColumns: ["id"];
          }
        ];
      };
      hospital_time_windows: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_time: string;
          hospital_id: string;
          id: string;
          is_active: boolean;
          start_time: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_time: string;
          hospital_id: string;
          id?: string;
          is_active?: boolean;
          start_time: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          hospital_id?: string;
          id?: string;
          is_active?: boolean;
          start_time?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hospital_time_windows_hospital_id_fkey";
            columns: ["hospital_id"];
            isOneToOne: false;
            referencedRelation: "hospitals";
            referencedColumns: ["id"];
          }
        ];
      };
      hospitals: {
        Row: {
          address: string;
          coordinates: Json | null;
          created_at: string | null;
          email: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          phone: string | null;
        };
        Insert: {
          address: string;
          coordinates?: Json | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          phone?: string | null;
        };
        Update: {
          address?: string;
          coordinates?: Json | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          blood_type: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          emergency_contact: string | null;
          emergency_phone: string | null;
          first_name: string;
          id: string;
          last_name: string;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          blood_type?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          first_name: string;
          id: string;
          last_name: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          blood_type?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_blood_units: {
        Args: {
          h_id: string;
          b_type: string;
          increment_val: number;
        };
        Returns: undefined;
      };
      get_user_role: {
        Args: { user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _user_id: string;
          _role: Database["public"]["Enums"]["app_role"];
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "donor" | "admin" | "agent";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["donor", "admin", "agent"],
    },
  },
} as const;
