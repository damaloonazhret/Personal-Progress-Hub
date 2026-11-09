create or replace function private.recurrence_weekdays_valid(unit text, weekdays smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when unit = 'day' then cardinality(weekdays) = 0
    when unit = 'week' then
      cardinality(weekdays) > 0
      and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      and cardinality(weekdays) = (select count(distinct day) from unnest(weekdays) as day)
    else false
  end;
$$;

revoke all on function private.recurrence_weekdays_valid(text, smallint[]) from public, anon;
grant execute on function private.recurrence_weekdays_valid(text, smallint[]) to authenticated, service_role;

create table public.recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid,
  project_id uuid,
  title text not null,
  description text,
  priority text not null default 'medium',
  unit text not null,
  interval_count integer not null,
  weekdays smallint[] not null default '{}',
  start_date date not null,
  end_date date,
  status text not null default 'active',
  generate_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurrence_rules_title_not_blank check (char_length(btrim(title)) > 0),
  constraint recurrence_rules_priority_check check (priority in ('low', 'medium', 'high')),
  constraint recurrence_rules_unit_check check (unit in ('day', 'week')),
  constraint recurrence_rules_interval_check check (interval_count between 1 and 365),
  constraint recurrence_rules_status_check check (status in ('active', 'paused', 'cancelled')),
  constraint recurrence_rules_project_requires_area check (project_id is null or area_id is not null),
  constraint recurrence_rules_dates_check check (
    generate_from >= start_date
    and (end_date is null or end_date >= start_date)
  ),
  constraint recurrence_rules_weekdays_check check (
    private.recurrence_weekdays_valid(unit, weekdays)
  ),
  constraint recurrence_rules_user_id_id_key unique (user_id, id),
  constraint recurrence_rules_area_user_fkey
    foreign key (user_id, area_id)
    references public.areas (user_id, id)
    on delete cascade,
  constraint recurrence_rules_project_area_user_fkey
    foreign key (user_id, project_id, area_id)
    references public.projects (user_id, id, area_id)
    on delete cascade
);

comment on table public.recurrence_rules is
  'Recurrence definition. Editing it does not rewrite tasks already created.';

comment on column public.recurrence_rules.unit is
  'day repeats every interval_count days from start_date. week repeats selected ISO weekdays in every interval_count-th ISO week, anchored to the week that contains start_date.';

comment on column public.recurrence_rules.weekdays is
  'ISO weekdays 1–7, Monday through Sunday. Empty for day rules. At least one distinct day for week rules.';

comment on column public.recurrence_rules.generate_from is
  'Earliest date a future generator may fill. Resume sets this to the user local date so paused days are not backfilled.';

comment on column public.recurrence_rules.status is
  'active generates, paused does not, cancelled stops permanently and keeps existing tasks.';

create index recurrence_rules_user_status_idx
  on public.recurrence_rules (user_id, status, created_at);

create trigger recurrence_rules_set_updated_at
  before update on public.recurrence_rules
  for each row
  execute function private.set_updated_at();

alter table public.recurrence_rules enable row level security;

revoke all on table public.recurrence_rules from anon, public;
grant select, insert, update, delete on table public.recurrence_rules to authenticated;

create policy recurrence_rules_select_own
  on public.recurrence_rules
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy recurrence_rules_insert_own
  on public.recurrence_rules
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy recurrence_rules_update_own
  on public.recurrence_rules
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy recurrence_rules_delete_own
  on public.recurrence_rules
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table public.recurrence_skips (
  user_id uuid not null,
  rule_id uuid not null,
  occurrence_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, rule_id, occurrence_date),
  constraint recurrence_skips_rule_user_fkey
    foreign key (user_id, rule_id)
    references public.recurrence_rules (user_id, id)
    on delete cascade
);

comment on table public.recurrence_skips is
  'Occurrence dates the generator must not recreate. Written when a date is skipped or its task is deleted.';

alter table public.recurrence_skips enable row level security;

revoke all on table public.recurrence_skips from anon, public;
grant select, insert, delete on table public.recurrence_skips to authenticated;

create policy recurrence_skips_select_own
  on public.recurrence_skips
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy recurrence_skips_insert_own
  on public.recurrence_skips
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy recurrence_skips_delete_own
  on public.recurrence_skips
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.tasks
  add column recurrence_rule_id uuid,
  add column recurrence_occurrence_date date;

alter table public.tasks
  add constraint tasks_recurrence_pair_check check (
    (recurrence_rule_id is null and recurrence_occurrence_date is null)
    or (recurrence_rule_id is not null and recurrence_occurrence_date is not null)
  ),
  add constraint tasks_recurrence_rule_user_fkey
    foreign key (user_id, recurrence_rule_id)
    references public.recurrence_rules (user_id, id)
    on delete set null (recurrence_rule_id);

create unique index tasks_user_rule_occurrence_key
  on public.tasks (user_id, recurrence_rule_id, recurrence_occurrence_date)
  where recurrence_rule_id is not null
    and recurrence_occurrence_date is not null;

comment on column public.tasks.recurrence_rule_id is
  'Rule that produced this occurrence. Null after the rule is deleted. Cancel leaves the link.';

comment on column public.tasks.recurrence_occurrence_date is
  'Original occurrence date. Independent of scheduled_date. Cleared when the rule link is removed.';

create or replace function private.protect_task_occurrence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.recurrence_rule_id is null then
    new.recurrence_occurrence_date = null;
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.recurrence_rule_id is not null
    and (
      new.recurrence_rule_id is distinct from old.recurrence_rule_id
      or new.recurrence_occurrence_date is distinct from old.recurrence_occurrence_date
    )
  then
    raise exception 'recurrence occurrence is immutable while the rule link exists';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_task_occurrence() from public, anon;
grant execute on function private.protect_task_occurrence() to authenticated, service_role;

create trigger tasks_protect_occurrence
  before update on public.tasks
  for each row
  execute function private.protect_task_occurrence();

create or replace function private.skip_deleted_occurrence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.recurrence_rule_id is not null and old.recurrence_occurrence_date is not null then
    insert into public.recurrence_skips (user_id, rule_id, occurrence_date)
    select old.user_id, old.recurrence_rule_id, old.recurrence_occurrence_date
    where exists (
      select 1
      from public.recurrence_rules as rule
      where rule.user_id = old.user_id
        and rule.id = old.recurrence_rule_id
    )
    on conflict (user_id, rule_id, occurrence_date) do nothing;
  end if;

  return old;
end;
$$;

revoke all on function private.skip_deleted_occurrence() from public, anon;
grant execute on function private.skip_deleted_occurrence() to authenticated, service_role;

create trigger tasks_skip_deleted_occurrence
  before delete on public.tasks
  for each row
  execute function private.skip_deleted_occurrence();
