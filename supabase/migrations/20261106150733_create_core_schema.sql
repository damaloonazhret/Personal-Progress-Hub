create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.sync_task_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    new.completed_at = coalesce(new.completed_at, now());
    new.in_today = false;
    new.today_position = null;
  elsif new.status = 'todo' then
    new.completed_at = null;
  end if;

  if new.in_today then
    new.today_position = coalesce(new.today_position, 0);
  else
    new.today_position = null;
  end if;

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.sync_task_state() from public;
grant execute on function private.set_updated_at() to authenticated, service_role;
grant execute on function private.sync_task_state() to authenticated, service_role;

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  color text,
  icon text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint areas_name_not_blank check (char_length(btrim(name)) > 0),
  constraint areas_user_id_id_key unique (user_id, id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null,
  name text not null,
  description text,
  status text not null default 'active',
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_not_blank check (char_length(btrim(name)) > 0),
  constraint projects_status_check check (status in ('active', 'archived')),
  constraint projects_user_id_id_key unique (user_id, id),
  constraint projects_user_area_id_key unique (user_id, id, area_id),
  constraint projects_area_user_fkey
    foreign key (user_id, area_id)
    references public.areas (user_id, id)
    on delete cascade
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid,
  project_id uuid,
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date date,
  in_today boolean not null default false,
  today_position integer,
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (char_length(btrim(title)) > 0),
  constraint tasks_status_check check (status in ('todo', 'done')),
  constraint tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint tasks_completion_state_check check (
    (
      status = 'done'
      and completed_at is not null
      and in_today = false
      and today_position is null
    )
    or (
      status = 'todo'
      and completed_at is null
    )
  ),
  constraint tasks_today_position_check check (
    (in_today = true and today_position is not null)
    or (in_today = false and today_position is null)
  ),
  constraint tasks_project_requires_area check (project_id is null or area_id is not null),
  constraint tasks_area_user_fkey
    foreign key (user_id, area_id)
    references public.areas (user_id, id)
    on delete cascade,
  constraint tasks_project_area_user_fkey
    foreign key (user_id, project_id, area_id)
    references public.projects (user_id, id, area_id)
    on delete cascade
);

comment on table public.areas is
  'Life directions owned by one user.';

comment on table public.projects is
  'Projects inside an area. A project always belongs to the same user as its area.';

comment on table public.tasks is
  'Actions. Today membership is independent from the optional due date.';

comment on column public.tasks.in_today is
  'User-selected membership in Today. Stays true across calendar days until the user removes or completes the task.';

comment on column public.tasks.today_position is
  'Manual order inside Today. Null when the task is not in Today.';

comment on column public.tasks.due_date is
  'Optional deadline. Does not add the task to Today.';

comment on column public.tasks.position is
  'Manual order in Inbox or inside a project. Independent of today_position.';

comment on column public.tasks.completed_at is
  'Set when status becomes done. Cleared when the task returns to todo.';

create index areas_user_position_idx
  on public.areas (user_id, position);

create index projects_user_area_position_idx
  on public.projects (user_id, area_id, position);

create index projects_user_status_idx
  on public.projects (user_id, status);

create index tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

create index tasks_user_today_position_idx
  on public.tasks (user_id, today_position)
  where in_today;

create index tasks_user_project_idx
  on public.tasks (user_id, project_id)
  where project_id is not null;

create index tasks_user_area_idx
  on public.tasks (user_id, area_id)
  where area_id is not null;

create index tasks_user_completed_at_idx
  on public.tasks (user_id, completed_at desc)
  where status = 'done';

create index tasks_user_due_date_idx
  on public.tasks (user_id, due_date)
  where due_date is not null;

create trigger areas_set_updated_at
  before update on public.areas
  for each row
  execute function private.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function private.set_updated_at();

create trigger tasks_sync_state
  before insert or update on public.tasks
  for each row
  execute function private.sync_task_state();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function private.set_updated_at();

alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

revoke all on table public.areas from anon, public;
revoke all on table public.projects from anon, public;
revoke all on table public.tasks from anon, public;

grant select, insert, update, delete on table public.areas to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy areas_select_own
  on public.areas
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy areas_insert_own
  on public.areas
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy areas_update_own
  on public.areas
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy areas_delete_own
  on public.areas
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy projects_select_own
  on public.projects
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy projects_insert_own
  on public.projects
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy projects_update_own
  on public.projects
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy projects_delete_own
  on public.projects
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_select_own
  on public.tasks
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_insert_own
  on public.tasks
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_update_own
  on public.tasks
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_delete_own
  on public.tasks
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
