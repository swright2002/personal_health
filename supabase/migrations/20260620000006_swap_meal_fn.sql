-- Atomic meal swap.
--
-- Replacing a planned meal is two writes: set the viewed member's recipe, and
-- (if the meal was "Together"/shared) break the moment apart since it's no
-- longer one shared dish. Doing those as two separate PostgREST calls is not
-- atomic — a failure between them could leave a `shared` moment whose members
-- hold different recipes. This function runs both in one implicit transaction.
--
-- It also: self-determines `shared` from the row (no client-trusted flag),
-- only demotes when the recipe actually CHANGES (so re-picking the current
-- recipe is a true no-op and never strips the Together grouping), and raises
-- when there's no assignment to swap (so a stale/closed-over tap surfaces an
-- error instead of silently demoting). SECURITY INVOKER keeps RLS in force.

create or replace function swap_meal(
  p_moment_id uuid,
  p_member_id uuid,
  p_recipe_id uuid
) returns void
language plpgsql
security invoker
as $$
declare
  v_old uuid;
  v_found boolean;
begin
  select true, recipe_id into v_found, v_old
    from moment_assignment
    where moment_id = p_moment_id and member_id = p_member_id;

  if not coalesce(v_found, false) then
    raise exception 'no assignment to swap for moment % / member %', p_moment_id, p_member_id
      using errcode = 'no_data_found';
  end if;

  -- Re-picking the same recipe changes nothing — leave the moment's mode alone.
  if v_old is not distinct from p_recipe_id then
    return;
  end if;

  update moment_assignment set recipe_id = p_recipe_id
    where moment_id = p_moment_id and member_id = p_member_id;

  -- The dish changed, so a shared moment is no longer one shared dish.
  update moment set mode = 'separate'
    where id = p_moment_id and mode = 'shared';
end;
$$;

grant execute on function swap_meal(uuid, uuid, uuid) to authenticated;
