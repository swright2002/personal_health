/** Plan-day helpers shared by the Plan and Recipes screens. */
import { supabase } from './supabase';

const SLOT_POSITION: Record<string, number> = { Breakfast: 10, Lunch: 20, Dinner: 30, Snack: 40 };

/** Add a recipe to one member's day as a new (separate) moment. */
export async function addRecipeToPlan(params: {
  householdId: string;
  date: string;
  memberId: string;
  recipeId: string;
  slot: string;
}): Promise<{ error: string | null }> {
  const { householdId, date, memberId, recipeId, slot } = params;
  const moment = await supabase
    .from('moment')
    .insert({ household_id: householdId, date, label: slot, mode: 'separate', position: SLOT_POSITION[slot] ?? 50 })
    .select('id')
    .single();
  if (moment.error) return { error: moment.error.message };

  const assignment = await supabase
    .from('moment_assignment')
    .insert({ moment_id: moment.data.id, member_id: memberId, recipe_id: recipeId, servings: 1 });
  return { error: assignment.error?.message ?? null };
}

/** Remove a member from a moment; drop the moment if no one's left on it. */
export async function removeFromPlan(momentId: string, memberId: string): Promise<{ error: string | null }> {
  const del = await supabase.from('moment_assignment').delete().eq('moment_id', momentId).eq('member_id', memberId);
  if (del.error) return { error: del.error.message };

  const remaining = await supabase.from('moment_assignment').select('id').eq('moment_id', momentId);
  if (!remaining.error && (remaining.data?.length ?? 0) === 0) {
    await supabase.from('moment').delete().eq('id', momentId);
  }
  return { error: null };
}
