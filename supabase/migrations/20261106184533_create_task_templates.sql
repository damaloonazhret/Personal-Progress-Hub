create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid,
  project_id uuid,
  title text not null,
  description text,
  priority text not null default 'medium',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_templates_title_not_blank check (char_length(btrim(title)) > 0),
  constraint task_templates_priority_check check (priority in ('low', 'medium', 'high')),
  constraint task_templates_project_requires_area check (project_id is null or area_id is not null),
  constraint task_templates_user_id_id_key unique (user_id, id),
  constraint task_templates_area_user_fkey
    foreign key (user_id, area_id)
    references public.areas (user_id, id)
    on delete cascade,
  constraint task_templates_project_area_user_fkey
    foreign key (user_id, project_id, area_id)
    references public.projects (user_id, id, area_id)
    on delete cascade
);

comment on table public.task_templates is
  'Reusable task blueprints. Creating a task copies these fields and does not keep them in sync.';

comment on column public.task_templates.priority is
  'Copied onto a new task. Later edits do not change tasks already created.';

create index task_templates_user_position_idx
  on public.task_templates (user_id, position);

create trigger task_templates_set_updated_at
  before update on public.task_templates
  for each row
  execute function private.set_updated_at();

alter table public.task_templates enable row level security;

revoke all on table public.task_templates from anon, public;
grant select, insert, update, delete on table public.task_templates to authenticated;

create policy task_templates_select_own
  on public.task_templates
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy task_templates_insert_own
  on public.task_templates
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy task_templates_update_own
  on public.task_templates
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy task_templates_delete_own
  on public.task_templates
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

alter table public.tasks
  add column template_id uuid;

alter table public.tasks
  add constraint tasks_template_user_fkey
  foreign key (user_id, template_id)
  references public.task_templates (user_id, id)
  on delete set null (template_id);

comment on column public.tasks.template_id is
  'Template this task was copied from. Null after the template is deleted. Edits stay on the task.';

create index tasks_user_template_idx
  on public.tasks (user_id, template_id)
  where template_id is not null;
