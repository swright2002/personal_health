/** Loads the household's recipe library for the Recipes screen. */
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type RecipeSlot = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type LibraryRecipe = {
  id: string;
  name: string;
  slot: RecipeSlot;
  servings: number;
  prep_time: string | null;
  vegan: boolean;
  tags: string[];
  kcal: number | null;
  protein: number | null;
  fiber: number | null;
  source_type: string;
  source_url: string | null;
  source_attribution: string | null;
};

export function useRecipes() {
  const [data, setData] = useState<LibraryRecipe[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await supabase
        .from('recipe')
        .select(
          'id,name,slot,servings,prep_time,vegan,tags,kcal,protein,fiber,source_type,source_url,source_attribution',
        )
        .order('name');
      if (!active) return;
      if (res.error) setError(res.error.message);
      else setData((res.data ?? []) as LibraryRecipe[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
