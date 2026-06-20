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

/**
 * Replace the recipe on one member's planned meal, keeping its slot/position/
 * servings. Atomic (one transaction via the `swap_meal` RPC): if the meal was
 * "Together"/shared it's broken apart to that member's own dish, but only when
 * the recipe actually changes — re-picking the current recipe is a no-op and
 * never strips the Together grouping. Errors if there's no assignment to swap.
 */
export async function swapMeal(params: {
  momentId: string;
  memberId: string;
  recipeId: string;
}): Promise<{ error: string | null }> {
  const { momentId, memberId, recipeId } = params;
  const { error } = await supabase.rpc('swap_meal', {
    p_moment_id: momentId,
    p_member_id: memberId,
    p_recipe_id: recipeId,
  });
  return { error: error?.message ?? null };
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
