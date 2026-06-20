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
      activity_log: {
        Row: {
          active_kcal: number | null
          created_at: string
          date: string
          distance_km: number | null
          duration_min: number | null
          id: string
          kind: string | null
          member_id: string
          source: string
        }
        Insert: {
          active_kcal?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          kind?: string | null
          member_id: string
          source?: string
        }
        Update: {
          active_kcal?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          duration_min?: number | null
          id?: string
          kind?: string | null
          member_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen: {
        Row: {
          key: string
          label: string
          position: number | null
          scheme: string
        }
        Insert: {
          key: string
          label: string
          position?: number | null
          scheme?: string
        }
        Update: {
          key?: string
          label?: string
          position?: number | null
          scheme?: string
        }
        Relationships: []
      }
      biometric: {
        Row: {
          created_at: string
          date: string
          id: string
          kind: string
          member_id: string
          source: string
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          kind: string
          member_id: string
          source?: string
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          member_id?: string
          source?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "biometric_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      food_term: {
        Row: {
          allergen_key: string | null
          ambiguous: boolean
          canonical: string
          gluten: boolean
          pescetarian_ok: boolean | null
          term: string
          vegan: boolean | null
          vegetarian: boolean | null
        }
        Insert: {
          allergen_key?: string | null
          ambiguous?: boolean
          canonical: string
          gluten?: boolean
          pescetarian_ok?: boolean | null
          term: string
          vegan?: boolean | null
          vegetarian?: boolean | null
        }
        Update: {
          allergen_key?: string | null
          ambiguous?: boolean
          canonical?: string
          gluten?: boolean
          pescetarian_ok?: boolean | null
          term?: string
          vegan?: boolean | null
          vegetarian?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "food_term_allergen_key_fkey"
            columns: ["allergen_key"]
            isOneToOne: false
            referencedRelation: "allergen"
            referencedColumns: ["key"]
          },
        ]
      }
      household: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ingredient: {
        Row: {
          canonical_key: string | null
          category: string | null
          created_at: string
          household_id: string
          id: string
          key: string
          label: string
          pantry: boolean
        }
        Insert: {
          canonical_key?: string | null
          category?: string | null
          created_at?: string
          household_id: string
          id?: string
          key: string
          label: string
          pantry?: boolean
        }
        Update: {
          canonical_key?: string | null
          category?: string | null
          created_at?: string
          household_id?: string
          id?: string
          key?: string
          label?: string
          pantry?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_portion: {
        Row: {
          created_at: string
          grams: number
          id: string
          ingredient_id: string
          source: string
          unit: string
        }
        Insert: {
          created_at?: string
          grams: number
          id?: string
          ingredient_id: string
          source?: string
          unit: string
        }
        Update: {
          created_at?: string
          grams?: number
          id?: string
          ingredient_id?: string
          source?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_portion_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_synonym: {
        Row: {
          confidence: number | null
          created_at: string
          household_id: string | null
          id: string
          ingredient_id: string
          source: string | null
          surface: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          household_id?: string | null
          id?: string
          ingredient_id: string
          source?: string | null
          surface: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          household_id?: string | null
          id?: string
          ingredient_id?: string
          source?: string | null
          surface?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_synonym_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_synonym_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          accent_color: string | null
          allergies: string[]
          auth_user_id: string | null
          created_at: string
          diet: string
          diet_level: number | null
          household_id: string
          id: string
          initials: string
          name: string
          restrictions: string[]
          role: string
          short: string
        }
        Insert: {
          accent_color?: string | null
          allergies?: string[]
          auth_user_id?: string | null
          created_at?: string
          diet?: string
          diet_level?: number | null
          household_id: string
          id?: string
          initials: string
          name: string
          restrictions?: string[]
          role?: string
          short: string
        }
        Update: {
          accent_color?: string | null
          allergies?: string[]
          auth_user_id?: string | null
          created_at?: string
          diet?: string
          diet_level?: number | null
          household_id?: string
          id?: string
          initials?: string
          name?: string
          restrictions?: string[]
          role?: string
          short?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      moment: {
        Row: {
          cooked_servings: number | null
          created_at: string
          date: string
          household_id: string
          id: string
          label: string
          mode: string
          position: number
        }
        Insert: {
          cooked_servings?: number | null
          created_at?: string
          date: string
          household_id: string
          id?: string
          label: string
          mode: string
          position?: number
        }
        Update: {
          cooked_servings?: number | null
          created_at?: string
          date?: string
          household_id?: string
          id?: string
          label?: string
          mode?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "moment_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_assignment: {
        Row: {
          id: string
          leftover_source: string | null
          member_id: string
          moment_id: string
          recipe_id: string | null
          servings: number
        }
        Insert: {
          id?: string
          leftover_source?: string | null
          member_id: string
          moment_id: string
          recipe_id?: string | null
          servings?: number
        }
        Update: {
          id?: string
          leftover_source?: string | null
          member_id?: string
          moment_id?: string
          recipe_id?: string | null
          servings?: number
        }
        Relationships: [
          {
            foreignKeyName: "moment_assignment_leftover_source_fkey"
            columns: ["leftover_source"]
            isOneToOne: false
            referencedRelation: "moment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_assignment_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_assignment_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_assignment_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          allergen_traces: string[]
          allergens: string[]
          analysis_source: string | null
          barcode: string | null
          brand: string
          carbs: number
          created_at: string
          diet_level: number | null
          diet_status: string | null
          fat: number
          fiber: number
          form: string | null
          gluten_free: boolean | null
          id: string
          ingredient_id: string
          ingredients_text: string | null
          is_default: boolean
          kcal: number
          name: string | null
          net_weight_g: number | null
          note: string | null
          price: number | null
          protein: number
          serving_size: number
          serving_unit: string
          servings_per_container: number | null
          size: string | null
          sodium: number
          source_ref: string | null
          source_url: string | null
          store: string | null
        }
        Insert: {
          allergen_traces?: string[]
          allergens?: string[]
          analysis_source?: string | null
          barcode?: string | null
          brand: string
          carbs?: number
          created_at?: string
          diet_level?: number | null
          diet_status?: string | null
          fat?: number
          fiber?: number
          form?: string | null
          gluten_free?: boolean | null
          id?: string
          ingredient_id: string
          ingredients_text?: string | null
          is_default?: boolean
          kcal?: number
          name?: string | null
          net_weight_g?: number | null
          note?: string | null
          price?: number | null
          protein?: number
          serving_size?: number
          serving_unit: string
          servings_per_container?: number | null
          size?: string | null
          sodium?: number
          source_ref?: string | null
          source_url?: string | null
          store?: string | null
        }
        Update: {
          allergen_traces?: string[]
          allergens?: string[]
          analysis_source?: string | null
          barcode?: string | null
          brand?: string
          carbs?: number
          created_at?: string
          diet_level?: number | null
          diet_status?: string | null
          fat?: number
          fiber?: number
          form?: string | null
          gluten_free?: boolean | null
          id?: string
          ingredient_id?: string
          ingredients_text?: string | null
          is_default?: boolean
          kcal?: number
          name?: string | null
          net_weight_g?: number | null
          note?: string | null
          price?: number | null
          protein?: number
          serving_size?: number
          serving_unit?: string
          servings_per_container?: number | null
          size?: string | null
          sodium?: number
          source_ref?: string | null
          source_url?: string | null
          store?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
        ]
      }
      product_selection: {
        Row: {
          household_id: string
          ingredient_id: string
          member_id: string | null
          product_id: string
          source: string
          updated_at: string
        }
        Insert: {
          household_id: string
          ingredient_id: string
          member_id?: string | null
          product_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          household_id?: string
          ingredient_id?: string
          member_id?: string | null
          product_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_selection_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_selection_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_selection_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_selection_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe: {
        Row: {
          allergens: string[]
          carbs: number | null
          created_at: string
          diet_level: number | null
          diet_status: string | null
          fat: number | null
          fiber: number | null
          health_tags: string[]
          household_id: string
          id: string
          img: string | null
          kcal: number | null
          name: string
          note: string | null
          nutrition_source: string | null
          prep_time: string | null
          protein: number | null
          servings: number
          slot: string
          slug: string
          sodium: number | null
          source_attribution: string | null
          source_type: string
          source_url: string | null
          tags: string[]
          vegan: boolean
        }
        Insert: {
          allergens?: string[]
          carbs?: number | null
          created_at?: string
          diet_level?: number | null
          diet_status?: string | null
          fat?: number | null
          fiber?: number | null
          health_tags?: string[]
          household_id: string
          id?: string
          img?: string | null
          kcal?: number | null
          name: string
          note?: string | null
          nutrition_source?: string | null
          prep_time?: string | null
          protein?: number | null
          servings?: number
          slot: string
          slug: string
          sodium?: number | null
          source_attribution?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[]
          vegan?: boolean
        }
        Update: {
          allergens?: string[]
          carbs?: number | null
          created_at?: string
          diet_level?: number | null
          diet_status?: string | null
          fat?: number | null
          fiber?: number | null
          health_tags?: string[]
          household_id?: string
          id?: string
          img?: string | null
          kcal?: number | null
          name?: string
          note?: string | null
          nutrition_source?: string | null
          prep_time?: string | null
          protein?: number | null
          servings?: number
          slot?: string
          slug?: string
          sodium?: number | null
          source_attribution?: string | null
          source_type?: string
          source_url?: string | null
          tags?: string[]
          vegan?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recipe_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_line: {
        Row: {
          group_heading: string | null
          id: string
          ingredient_id: string | null
          name: string | null
          note: string | null
          position: number
          quantity: number | null
          raw_text: string | null
          recipe_id: string
          unit: string | null
        }
        Insert: {
          group_heading?: string | null
          id?: string
          ingredient_id?: string | null
          name?: string | null
          note?: string | null
          position?: number
          quantity?: number | null
          raw_text?: string | null
          recipe_id: string
          unit?: string | null
        }
        Update: {
          group_heading?: string | null
          id?: string
          ingredient_id?: string | null
          name?: string | null
          note?: string | null
          position?: number
          quantity?: number | null
          raw_text?: string | null
          recipe_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_line_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_line_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_line_product: {
        Row: {
          member_id: string
          product_id: string
          recipe_line_id: string
        }
        Insert: {
          member_id: string
          product_id: string
          recipe_line_id: string
        }
        Update: {
          member_id?: string
          product_id?: string
          recipe_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_line_product_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_line_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_line_product_recipe_line_id_fkey"
            columns: ["recipe_line_id"]
            isOneToOne: false
            referencedRelation: "recipe_line"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_check: {
        Row: {
          checked: boolean
          household_id: string
          product_id: string
          updated_at: string
          week: string
        }
        Insert: {
          checked?: boolean
          household_id: string
          product_id: string
          updated_at?: string
          week: string
        }
        Update: {
          checked?: boolean
          household_id?: string
          product_id?: string
          updated_at?: string
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_check_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_check_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_log: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          member_id: string
          source: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_min?: number | null
          id?: string
          member_id: string
          source?: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          member_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "sleep_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      target: {
        Row: {
          carbs: number
          fat: number
          fiber: number
          id: string
          kcal: number
          kind: string
          member_id: string
          protein: number
        }
        Insert: {
          carbs: number
          fat: number
          fiber: number
          id?: string
          kcal: number
          kind: string
          member_id: string
          protein: number
        }
        Update: {
          carbs?: number
          fat?: number
          fiber?: number
          id?: string
          kcal?: number
          kind?: string
          member_id?: string
          protein?: number
        }
        Relationships: [
          {
            foreignKeyName: "target_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_log: {
        Row: {
          created_at: string
          date: string
          id: string
          member_id: string
          source: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          member_id: string
          source?: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          member_id?: string
          source?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_log_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_household_id: { Args: never; Returns: string }
      swap_meal: {
        Args: { p_member_id: string; p_moment_id: string; p_recipe_id: string }
        Returns: undefined
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
