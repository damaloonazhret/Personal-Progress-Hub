create table public.ci_pipeline_smoke_test (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now()
);

comment on table public.ci_pipeline_smoke_test
    is 'Temporary table for CI/CD migration smoke testing';

revoke all on table public.ci_pipeline_smoke_test
    from anon, authenticated;
    
alter table public.ci_pipeline_smoke_test
    enable row level security;