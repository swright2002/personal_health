/**
 * Hand-authored types for the Harbor M1 schema (see supabase/migrations).
 * Regenerate from the live database once the Supabase CLI is linked:
 *   supabase gen types typescript --linked > mobile/src/lib/database.types.ts
 */

type Timestamptz = string;
type DateString = string; // 'YYYY-MM-DD'
type UUID = string;

export type Diet = 'Omnivore' | 'Vegan';
export type MemberRole = 'owner' | 'member';
export type TargetKind = 'run_day' | 'rest_day' | 'maintenance';
export type RecipeSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type MomentMode = 'shared' | 'separate';
export type LogSource = 'manual' | 'healthkit';

export interface Database {
  public: {
    Tables: {
      household: {
        Row: { id: UUID; name: string; created_at: Timestamptz };
        Insert: { id?: UUID; name: string; created_at?: Timestamptz };
        Update: Partial<Database['public']['Tables']['household']['Insert']>;
      };
      member: {
        Row: {
          id: UUID;
          household_id: UUID;
          auth_user_id: UUID | null;
          name: string;
          short: string;
          initials: string;
          diet: Diet;
          accent_color: string | null;
          role: MemberRole;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          auth_user_id?: UUID | null;
          name: string;
          short: string;
          initials: string;
          diet?: Diet;
          accent_color?: string | null;
          role?: MemberRole;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['member']['Insert']>;
      };
      target: {
        Row: {
          id: UUID;
          member_id: UUID;
          kind: TargetKind;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
        };
        Insert: {
          id?: UUID;
          member_id: UUID;
          kind: TargetKind;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
        };
        Update: Partial<Database['public']['Tables']['target']['Insert']>;
      };
      ingredient: {
        Row: {
          id: UUID;
          household_id: UUID;
          key: string;
          label: string;
          pantry: boolean;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          key: string;
          label: string;
          pantry?: boolean;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['ingredient']['Insert']>;
      };
      product: {
        Row: {
          id: UUID;
          ingredient_id: UUID;
          store: string;
          brand: string;
          size: string | null;
          price: number | null;
          serving_size: number;
          serving_unit: string;
          kcal: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
          sodium: number;
          note: string | null;
          is_default: boolean;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          ingredient_id: UUID;
          store: string;
          brand: string;
          size?: string | null;
          price?: number | null;
          serving_size?: number;
          serving_unit: string;
          kcal?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          sodium?: number;
          note?: string | null;
          is_default?: boolean;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['product']['Insert']>;
      };
      recipe: {
        Row: {
          id: UUID;
          household_id: UUID;
          slug: string;
          name: string;
          slot: RecipeSlot;
          prep_time: string | null;
          servings: number;
          img: string | null;
          vegan: boolean;
          tags: string[];
          note: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          slug: string;
          name: string;
          slot: RecipeSlot;
          prep_time?: string | null;
          servings?: number;
          img?: string | null;
          vegan?: boolean;
          tags?: string[];
          note?: string | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['recipe']['Insert']>;
      };
      recipe_line: {
        Row: {
          id: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          quantity: number;
          unit: string;
          position: number;
        };
        Insert: {
          id?: UUID;
          recipe_id: UUID;
          ingredient_id: UUID;
          quantity: number;
          unit: string;
          position?: number;
        };
        Update: Partial<Database['public']['Tables']['recipe_line']['Insert']>;
      };
      product_selection: {
        Row: {
          household_id: UUID;
          ingredient_id: UUID;
          product_id: UUID;
          updated_at: Timestamptz;
        };
        Insert: {
          household_id: UUID;
          ingredient_id: UUID;
          product_id: UUID;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['product_selection']['Insert']>;
      };
      moment: {
        Row: {
          id: UUID;
          household_id: UUID;
          date: DateString;
          label: string;
          position: number;
          mode: MomentMode;
          cooked_servings: number | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          household_id: UUID;
          date: DateString;
          label: string;
          position?: number;
          mode: MomentMode;
          cooked_servings?: number | null;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['moment']['Insert']>;
      };
      moment_assignment: {
        Row: {
          id: UUID;
          moment_id: UUID;
          member_id: UUID;
          recipe_id: UUID | null;
          servings: number;
          leftover_source: UUID | null;
        };
        Insert: {
          id?: UUID;
          moment_id: UUID;
          member_id: UUID;
          recipe_id?: UUID | null;
          servings?: number;
          leftover_source?: UUID | null;
        };
        Update: Partial<Database['public']['Tables']['moment_assignment']['Insert']>;
      };
      shopping_check: {
        Row: {
          household_id: UUID;
          week: DateString;
          product_id: UUID;
          checked: boolean;
          updated_at: Timestamptz;
        };
        Insert: {
          household_id: UUID;
          week: DateString;
          product_id: UUID;
          checked?: boolean;
          updated_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['shopping_check']['Insert']>;
      };
      activity_log: {
        Row: {
          id: UUID;
          member_id: UUID;
          date: DateString;
          kind: string | null;
          distance_km: number | null;
          duration_min: number | null;
          active_kcal: number | null;
          source: LogSource;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          member_id: UUID;
          date: DateString;
          kind?: string | null;
          distance_km?: number | null;
          duration_min?: number | null;
          active_kcal?: number | null;
          source?: LogSource;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
      };
      weight_log: {
        Row: {
          id: UUID;
          member_id: UUID;
          date: DateString;
          weight_kg: number;
          source: LogSource;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          member_id: UUID;
          date: DateString;
          weight_kg: number;
          source?: LogSource;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['weight_log']['Insert']>;
      };
      sleep_log: {
        Row: {
          id: UUID;
          member_id: UUID;
          date: DateString;
          duration_min: number | null;
          source: LogSource;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          member_id: UUID;
          date: DateString;
          duration_min?: number | null;
          source?: LogSource;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['sleep_log']['Insert']>;
      };
      biometric: {
        Row: {
          id: UUID;
          member_id: UUID;
          date: DateString;
          kind: string;
          value: number;
          unit: string | null;
          source: LogSource;
          created_at: Timestamptz;
        };
        Insert: {
          id?: UUID;
          member_id: UUID;
          date: DateString;
          kind: string;
          value: number;
          unit?: string | null;
          source?: LogSource;
          created_at?: Timestamptz;
        };
        Update: Partial<Database['public']['Tables']['biometric']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_household_id: { Args: Record<string, never>; Returns: UUID };
    };
    Enums: Record<string, never>;
  };
}

/** Convenience row aliases. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
