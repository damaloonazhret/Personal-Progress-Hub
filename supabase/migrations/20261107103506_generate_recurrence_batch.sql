create or replace function private.recurrence_date_matches(
  unit text,
  interval_count integer,
  weekdays smallint[],
  start_date date,
  end_date date,
  generate_from date,
  occurrence_date date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    occurrence_date >= start_date
    and occurrence_date >= generate_from
    and (end_date is null or occurrence_date <= end_date)
    and case
      when unit = 'day' then
        (occurrence_date - start_date) % interval_count = 0
      when unit = 'week' then
        extract(isodow from occurrence_date)::smallint = any (weekdays)
        and (
          (
            (occurrence_date - (extract(isodow from occurrence_date)::integer - 1))
            - (start_date - (extract(isodow from start_date)::integer - 1))
          ) / 7
        ) % interval_count = 0
      else false
    end;
$$;

revoke all on function private.recurrence_date_matches(text, integer, smallint[], date, date, date, date) from public, anon;
grant execute on function private.recurrence_date_matches(text, integer, smallint[], date, date, date, date) to authenticated, service_role;

create or replace function private.skip_deleted_occurrence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.recurrence_rule_id is null or old.recurrence_occurrence_date is null then
    return old;
  end if;

  perform 1
  from public.recurrence_rules as rule
  where rule.user_id = old.user_id
    and rule.id = old.recurrence_rule_id
  for update;

  if not found then
    return old;
  end if;

  insert into public.recurrence_skips (user_id, rule_id, occurrence_date)
  values (old.user_id, old.recurrence_rule_id, old.recurrence_occurrence_date)
  on conflict (user_id, rule_id, occurrence_date) do nothing;

  return old;
end;
$$;

create or replace function public.generate_recurrence_batch(
  p_from date,
  p_to date,
  p_rule_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 91 then
    raise exception 'invalid recurrence range';
  end if;

  if p_rule_ids is null or cardinality(p_rule_ids) = 0 then
    return 0;
  end if;

  if cardinality(p_rule_ids) > 25 then
    raise exception 'recurrence batch has too many rules';
  end if;

  perform 1
  from public.recurrence_rules as rule
  where rule.user_id = (select auth.uid())
    and rule.id = any (p_rule_ids)
    and rule.status = 'active'
    and rule.start_date <= p_to
    and rule.generate_from <= p_to
    and (rule.end_date is null or rule.end_date >= p_from)
  order by rule.id
  for update;

  insert into public.tasks (
    user_id,
    title,
    description,
    priority,
    status,
    due_date,
    scheduled_date,
    day_position,
    position,
    project_id,
    area_id,
    recurrence_rule_id,
    recurrence_occurrence_date
  )
  select
    rule.user_id,
    rule.title,
    rule.description,
    rule.priority,
    'todo',
    null,
    occurrence.occurrence_date,
    coalesce(day_bounds.max_day_position, -1) + row_number() over (
      partition by occurrence.occurrence_date, rule.priority
      order by rule.id
    ),
    coalesce(list_bounds.max_position, -1) + row_number() over (
      partition by rule.area_id, rule.project_id
      order by occurrence.occurrence_date, rule.id
    ),
    rule.project_id,
    rule.area_id,
    rule.id,
    occurrence.occurrence_date
  from public.recurrence_rules as rule
  cross join lateral (
    select day::date as occurrence_date
    from generate_series(
      greatest(p_from, rule.start_date, rule.generate_from)::timestamp,
      least(p_to, coalesce(rule.end_date, p_to))::timestamp,
      interval '1 day'
    ) as day
  ) as occurrence
  left join lateral (
    select max(existing.day_position) as max_day_position
    from public.tasks as existing
    where existing.user_id = rule.user_id
      and existing.scheduled_date = occurrence.occurrence_date
      and existing.priority = rule.priority
  ) as day_bounds on true
  left join lateral (
    select max(existing.position) as max_position
    from public.tasks as existing
    where existing.user_id = rule.user_id
      and existing.area_id is not distinct from rule.area_id
      and existing.project_id is not distinct from rule.project_id
  ) as list_bounds on true
  where rule.user_id = (select auth.uid())
    and rule.id = any (p_rule_ids)
    and rule.status = 'active'
    and rule.start_date <= p_to
    and rule.generate_from <= p_to
    and (rule.end_date is null or rule.end_date >= p_from)
    and private.recurrence_date_matches(
      rule.unit,
      rule.interval_count,
      rule.weekdays,
      rule.start_date,
      rule.end_date,
      rule.generate_from,
      occurrence.occurrence_date
    )
    and not exists (
      select 1
      from public.recurrence_skips as skip
      where skip.user_id = rule.user_id
        and skip.rule_id = rule.id
        and skip.occurrence_date = occurrence.occurrence_date
    )
  order by rule.id, occurrence.occurrence_date
  on conflict (user_id, recurrence_rule_id, recurrence_occurrence_date)
    where recurrence_rule_id is not null
      and recurrence_occurrence_date is not null
  do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.generate_recurrence_batch(date, date, uuid[]) from public, anon;
grant execute on function public.generate_recurrence_batch(date, date, uuid[]) to authenticated;

comment on function public.generate_recurrence_batch(date, date, uuid[]) is
  'Creates missing occurrences for the signed-in user. Locks the given active rules in id order, skips recurrence_skips, and ignores conflicts on the occurrence key. One call covers at most 92 days and 25 rules.';
