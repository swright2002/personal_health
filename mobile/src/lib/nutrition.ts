/**
 * Nutrition math — the production-correct version of the prototype's recNutr/
 * sumNutr. Product nutrition is stored per the product's serving_size; a recipe
 * line scales it by (quantity / serving_size). Per-serving recipe nutrition is
 * the summed lines divided by the recipe's natural yield.
 */

export type Nutrition = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

export const ZERO_NUTRITION: Nutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function scaleNutrition(n: Nutrition, k: number): Nutrition {
  return { kcal: n.kcal * k, protein: n.protein * k, carbs: n.carbs * k, fat: n.fat * k, fiber: n.fiber * k };
}

export const roundFiber = (x: number) => Math.round(x * 10) / 10;

export type RecipeLineInput = {
  /** the selected product's nutrition, per its serving_size */
  n: Nutrition;
  /** how much the recipe line calls for, in the same unit as serving_size */
  quantity: number;
  /** the product's serving_size (the amount `n` is measured per) */
  servingSize: number;
};

/** Per-serving nutrition for one recipe (matches the prototype's rounding). */
export function recipeNutrition(lines: RecipeLineInput[], servings: number): Nutrition {
  let total = ZERO_NUTRITION;
  for (const line of lines) {
    const factor = line.servingSize ? line.quantity / line.servingSize : 0;
    total = addNutrition(total, scaleNutrition(line.n, factor));
  }
  const s = servings || 1;
  return {
    kcal: Math.round(total.kcal / s),
    protein: Math.round(total.protein / s),
    carbs: Math.round(total.carbs / s),
    fat: Math.round(total.fat / s),
    fiber: roundFiber(total.fiber / s),
  };
}
