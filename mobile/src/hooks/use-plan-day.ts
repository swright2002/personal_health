/**
 * Loads one day's plan for the whole household and computes each person's
 * nutrition against their target. Ports the prototype's mealsFor / sumNutr /
 * personTargets onto the real schema.
 */

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import {
  addNutrition,
  recipeNutrition,
  roundFiber,
  scaleNutrition,
  ZERO_NUTRITION,
  type Nutrition,
} from '@/lib/nutrition';

export type PlanTarget = {
  kind: 'run_day' | 'rest_day' | 'maintenance';
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export type PlanMember = {
  id: string;
  name: string;
  short: string;
  initials: string;
  diet: string;
  accentColor: string | null;
  role: string;
};

export type PlanMeal = {
  momentId: string;
  label: string;
  recipeId: string;
  recipeName: string;
  slot: string;
  shared: boolean;
  kcal: number;
};

export type PersonPlan = {
  meals: PlanMeal[];
  totals: Nutrition;
  target: PlanTarget | null;
};

export type PlanData = {
  members: PlanMember[];
  byMember: Record<string, PersonPlan>;
};

// Until run days are driven by activity data (M4), mirror the prototype: the
// omnivore runs Tue/Thu/Sat. Vegan members only have a maintenance target.
const RUN_WEEKDAYS = new Set([2, 4, 6]);

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function usePlanDay(date: string) {
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      const momentsR = await supabase
        .from('moment')
        .select('id,label,position,mode')
        .eq('date', date)
        .order('position');

      if (momentsR.error) {
        if (active) {
          setError(momentsR.error.message);
          setLoading(false);
        }
        return;
      }
      const moments = momentsR.data ?? [];
      const momentIds = moments.map((m) => m.id);

      const [membersR, targetsR, assignsR, recipesR, linesR, selR, productsR] = await Promise.all([
        supabase.from('member').select('id,name,short,initials,diet,accent_color,role'),
        supabase.from('target').select('member_id,kind,kcal,protein,carbs,fat,fiber'),
        supabase.from('moment_assignment').select('moment_id,member_id,recipe_id,servings').in('moment_id', momentIds),
        supabase.from('recipe').select('id,name,slot,servings,kcal,protein,carbs,fat,fiber'),
        supabase.from('recipe_line').select('recipe_id,ingredient_id,quantity'),
        supabase.from('product_selection').select('ingredient_id,product_id'),
        supabase.from('product').select('id,serving_size,kcal,protein,carbs,fat,fiber'),
      ]);

      const failed = [membersR, targetsR, assignsR, recipesR, linesR, selR, productsR].find((r) => r.error);
      if (failed?.error) {
        if (active) {
          setError(failed.error.message);
          setLoading(false);
        }
        return;
      }

      const members = membersR.data ?? [];
      const targets = targetsR.data ?? [];
      const assignments = assignsR.data ?? [];
      const recipes = recipesR.data ?? [];
      const lines = linesR.data ?? [];
      const selections = selR.data ?? [];
      const products = productsR.data ?? [];

      // ingredient -> its selected product
      const productById = new Map(products.map((p) => [p.id, p]));
      const productByIngredient = new Map<string, (typeof products)[number]>();
      for (const sel of selections) {
        const p = productById.get(sel.product_id);
        if (p) productByIngredient.set(sel.ingredient_id, p);
      }

      const linesByRecipe = new Map<string, typeof lines>();
      for (const l of lines) {
        const arr = linesByRecipe.get(l.recipe_id);
        if (arr) arr.push(l);
        else linesByRecipe.set(l.recipe_id, [l]);
      }

      // per-serving nutrition for each recipe
      const recipeById = new Map(recipes.map((r) => [r.id, r]));
      const recipeNutr = new Map<string, Nutrition>();
      for (const r of recipes) {
        const inputs = (linesByRecipe.get(r.id) ?? []).map((l) => {
          const p = l.ingredient_id ? productByIngredient.get(l.ingredient_id) : undefined;
          return {
            n: p
              ? { kcal: p.kcal, protein: p.protein, carbs: p.carbs, fat: p.fat, fiber: p.fiber }
              : ZERO_NUTRITION,
            quantity: l.quantity ?? 0,
            servingSize: p?.serving_size ?? 1,
          };
        });
        // Product-computed nutrition; fall back to the recipe's cached
        // per-serving values (imported recipes have no product mapping yet).
        const computed = recipeNutrition(inputs, r.servings);
        const hasProducts =
          computed.kcal > 0 || computed.protein > 0 || computed.carbs > 0 || computed.fat > 0 || computed.fiber > 0;
        recipeNutr.set(
          r.id,
          hasProducts
            ? computed
            : {
                kcal: Number(r.kcal ?? 0),
                protein: Number(r.protein ?? 0),
                carbs: Number(r.carbs ?? 0),
                fat: Number(r.fat ?? 0),
                fiber: Number(r.fiber ?? 0),
              },
        );
      }

      const isRunDay = RUN_WEEKDAYS.has(weekdayOf(date));
      const pickTarget = (memberId: string): PlanTarget | null => {
        const mine = targets.filter((t) => t.member_id === memberId);
        const maintenance = mine.find((t) => t.kind === 'maintenance');
        if (maintenance) return maintenance as PlanTarget;
        const wanted = isRunDay ? 'run_day' : 'rest_day';
        return (mine.find((t) => t.kind === wanted) as PlanTarget | undefined) ?? null;
      };

      const byMember: Record<string, PersonPlan> = {};
      for (const m of members) {
        const meals: PlanMeal[] = [];
        let totals = ZERO_NUTRITION;
        for (const mo of moments) {
          const a = assignments.find((x) => x.moment_id === mo.id && x.member_id === m.id && x.recipe_id);
          if (!a || !a.recipe_id) continue;
          const rn = recipeNutr.get(a.recipe_id) ?? ZERO_NUTRITION;
          totals = addNutrition(totals, scaleNutrition(rn, a.servings));
          meals.push({
            momentId: mo.id,
            label: mo.label,
            recipeId: a.recipe_id,
            recipeName: recipeById.get(a.recipe_id)?.name ?? '—',
            slot: recipeById.get(a.recipe_id)?.slot ?? '',
            shared: mo.mode === 'shared',
            kcal: Math.round(rn.kcal * a.servings),
          });
        }
        totals = { ...totals, fiber: roundFiber(totals.fiber) };
        byMember[m.id] = { meals, totals, target: pickTarget(m.id) };
      }

      if (active) {
        setData({
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            short: m.short,
            initials: m.initials,
            diet: m.diet,
            accentColor: m.accent_color,
            role: m.role,
          })),
          byMember,
        });
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [date, reload]);

  const refetch = useCallback(() => setReload((n) => n + 1), []);
  return { data, loading, error, refetch };
}
