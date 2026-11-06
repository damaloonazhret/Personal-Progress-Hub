create or replace function private.is_iana_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if tz is null or char_length(btrim(tz)) = 0 or char_length(tz) > 64 then
    return false;
  end if;

  if tz !~ '^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)*$' then
    return false;
  end if;

  perform (timestamp '2020-01-01 00:00:00' at time zone tz);
  return true;
exception
  when others then
    return false;
end;
$$;

revoke all on function private.is_iana_timezone(text) from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_valid check (private.is_iana_timezone(timezone))
);

comment on table public.profiles is
  'One planning timezone per user. Dates already stored are not rewritten when this changes.';

comment on column public.profiles.timezone is
  'IANA timezone. Etc/GMT+12 means the browser has not replaced the migration fallback yet.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, public;
grant select, insert, update on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into public.profiles (user_id, timezone)
select id, 'Etc/GMT+12'
from auth.users
on conflict (user_id) do nothing;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, timezone)
  values (new.id, 'Etc/GMT+12')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function private.create_profile_for_new_user();

alter table public.tasks
  add column scheduled_date date,
  add column day_position integer;

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
    new.scheduled_date = null;
    new.day_position = null;
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

update public.tasks as task
set
  scheduled_date = (now() at time zone profile.timezone)::date,
  day_position = task.today_position
from public.profiles as profile
where task.user_id = profile.user_id
  and task.in_today;

alter table public.tasks
  drop constraint tasks_completion_state_check,
  drop constraint tasks_today_position_check;

drop index public.tasks_user_today_position_idx;

alter table public.tasks
  drop column in_today,
  drop column today_position;

alter table public.tasks
  add constraint tasks_completion_state_check check (
    (status = 'done' and completed_at is not null)
    or (status = 'todo' and completed_at is null)
  ),
  add constraint tasks_schedule_position_check check (
    (scheduled_date is not null and day_position is not null)
    or (scheduled_date is null and day_position is null)
  );

create index tasks_user_scheduled_priority_position_idx
  on public.tasks (user_id, scheduled_date, priority, day_position)
  where scheduled_date is not null;

comment on column public.tasks.scheduled_date is
  'Planned calendar day. Today includes unfinished tasks on or before the user''s local date. Independent of due_date.';

comment on column public.tasks.day_position is
  'Manual order inside one scheduled_date and one priority. Null when scheduled_date is null.';

comment on column public.tasks.position is
  'Manual order in Inbox or inside a project. Independent of day_position.';

comment on table public.tasks is
  'Actions. The planned day and the optional due date are independent.';
