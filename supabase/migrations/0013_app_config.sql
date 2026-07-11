-- 0013_app_config.sql — tiny single-row config table for values the app needs to read
-- at runtime that change independently of a deploy. Currently just one value: the
-- latest EAS "preview" build's install link, kept current by
-- .eas/workflows/preview-build.yml after every preview build.
--
-- MANUAL STEP: run this in the Supabase SQL editor.

create table app_config (
  id                 smallint primary key default 1 check (id = 1),
  latest_preview_url text,
  updated_at         timestamptz not null default now()
);

insert into app_config (id) values (1);

alter table app_config enable row level security;

-- Public read, no auth required — the sign-in screen's "Get the app" banner and the
-- share-invite email both need this before/without a session. Writes only ever come
-- from the EAS workflow using the service-role key, which bypasses RLS, so there is
-- no insert/update/delete policy.
create policy "app_config: public select"
  on app_config for select
  using (true);
