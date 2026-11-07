-- Calendar reopen keeps scheduled_date. Today and Completed clear it in their actions.
-- A series is one rule plus its tasks. Editing and deleting a series are atomic.

create or replace function private.sync_task_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    new.completed_at = coalesce(new.completed_at, now());
  elsif tg_op = 'UPDATE' and old.status = 'done' and new.status = 'todo' then
    new.completed_at = null;
  elsif new.status = 'todo' then
    new.completed_at = null;
  end if;

  if new.scheduled_date is null then
    new.day_position = null;
  elsif new.day_position is null then
    new.day_position = 0;
  end if;

  return new;
end;
$$;

create or replace function private.skip_deleted_occurrence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Series reconcile deletes active rows that no longer match. Those dates must stay generatable.
  if current_setting('app.recurrence_reconcile', true) = 'on' then
    return old;
  end if;

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

create or replace function public.apply_recurrence_series(
  p_rule_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_area_id uuid,
  p_project_id uuid,
  p_unit text,
  p_interval_count integer,
  p_weekdays smallint[],
  p_start_date date,
  p_end_date date
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_rule public.recurrence_rules%rowtype;
  sorted_weekdays smallint[];
  current_weekdays smallint[];
  schedule_changed boolean;
  next_generate_from date;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  select *
  into current_rule
  from public.recurrence_rules
  where id = p_rule_id
    and user_id = (select auth.uid())
  for update;

  if not found or current_rule.status = 'cancelled' then
    raise exception 'recurrence rule not found';
  end if;

  select coalesce(array_agg(sorted.day order by sorted.day), '{}'::smallint[])
  into sorted_weekdays
  from unnest(coalesce(p_weekdays, '{}'::smallint[])) as sorted(day);

  select coalesce(array_agg(current_day.day order by current_day.day), '{}'::smallint[])
  into current_weekdays
  from unnest(current_rule.weekdays) as current_day(day);

  schedule_changed :=
    current_rule.unit is distinct from p_unit
    or current_rule.interval_count is distinct from p_interval_count
    or current_rule.start_date is distinct from p_start_date
    or current_weekdays is distinct from sorted_weekdays;

  -- A schedule change must not leave generate_from ahead of newly valid dates.
  if schedule_changed then
    next_generate_from := p_start_date;
  else
    next_generate_from := greatest(current_rule.generate_from, p_start_date);
  end if;

  update public.recurrence_rules
  set
    title = p_title,
    description = p_description,
    priority = p_priority,
    area_id = p_area_id,
    project_id = p_project_id,
    unit = p_unit,
    interval_count = p_interval_count,
    weekdays = sorted_weekdays,
    start_date = p_start_date,
    end_date = p_end_date,
    generate_from = next_generate_from
  where id = p_rule_id
    and user_id = (select auth.uid());

  update public.tasks
  set
    title = p_title,
    description = p_description,
    priority = p_priority,
    area_id = p_area_id,
    project_id = p_project_id,
    scheduled_date = case
      when status = 'todo' then recurrence_occurrence_date
      else scheduled_date
    end,
    day_position = case
      when status = 'todo' and scheduled_date is distinct from recurrence_occurrence_date then 0
      when status = 'todo' then coalesce(day_position, 0)
      else day_position
    end
  where user_id = (select auth.uid())
    and recurrence_rule_id = p_rule_id;

  perform set_config('app.recurrence_reconcile', 'on', true);

  delete from public.tasks as task
  where task.user_id = (select auth.uid())
    and task.recurrence_rule_id = p_rule_id
    and task.status = 'todo'
    and (
      exists (
        select 1
        from public.recurrence_skips as skip
        where skip.user_id = task.user_id
          and skip.rule_id = task.recurrence_rule_id
          and skip.occurrence_date = task.recurrence_occurrence_date
      )
      or not private.recurrence_date_matches(
        p_unit,
        p_interval_count,
        sorted_weekdays,
        p_start_date,
        p_end_date,
        p_start_date,
        task.recurrence_occurrence_date
      )
    );

  perform set_config('app.recurrence_reconcile', 'off', true);

  return 1;
end;
$$;

create or replace function public.delete_recurrence_series(p_rule_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required';
  end if;

  perform 1
  from public.recurrence_rules
  where id = p_rule_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'recurrence rule not found';
  end if;

  perform set_config('app.recurrence_reconcile', 'on', true);

  delete from public.tasks
  where user_id = (select auth.uid())
    and recurrence_rule_id = p_rule_id;

  perform set_config('app.recurrence_reconcile', 'off', true);

  delete from public.recurrence_rules
  where id = p_rule_id
    and user_id = (select auth.uid());

  return 1;
end;
$$;

revoke all on function public.apply_recurrence_series(uuid, text, text, text, uuid, uuid, text, integer, smallint[], date, date) from public, anon;
grant execute on function public.apply_recurrence_series(uuid, text, text, text, uuid, uuid, text, integer, smallint[], date, date) to authenticated;

revoke all on function public.delete_recurrence_series(uuid) from public, anon;
grant execute on function public.delete_recurrence_series(uuid) to authenticated;

comment on function public.apply_recurrence_series(uuid, text, text, text, uuid, uuid, text, integer, smallint[], date, date) is
  'Updates one series. Shared fields change on every linked task. Active occurrences that no longer match are deleted without a skip. Completed occurrences stay.';

comment on function public.delete_recurrence_series(uuid) is
  'Deletes every task of one series, then the rule. Skips cascade with the rule. Does not change the task foreign key.';
