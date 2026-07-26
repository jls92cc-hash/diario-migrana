-- Ejecuta todo este script en Supabase: Dashboard -> SQL Editor -> New query -> pega y "Run"

create table if not exists entries (
  user_id uuid references auth.users not null,
  day date not null,
  data jsonb not null,
  updated_at timestamp with time zone default now(),
  primary key (user_id, day)
);

alter table entries enable row level security;

create policy "select own entries" on entries
  for select using (auth.uid() = user_id);
create policy "insert own entries" on entries
  for insert with check (auth.uid() = user_id);
create policy "update own entries" on entries
  for update using (auth.uid() = user_id);
create policy "delete own entries" on entries
  for delete using (auth.uid() = user_id);

create table if not exists profiles (
  user_id uuid references auth.users primary key,
  data jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "select own profile" on profiles
  for select using (auth.uid() = user_id);
create policy "insert own profile" on profiles
  for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles
  for update using (auth.uid() = user_id);
