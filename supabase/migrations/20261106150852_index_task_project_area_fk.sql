create index tasks_user_project_area_idx
  on public.tasks (user_id, project_id, area_id);
