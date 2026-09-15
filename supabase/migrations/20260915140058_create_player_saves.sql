create table if not exists public.player_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  save_key text not null check (save_key in ('idlecraft-save-v4', 'idlecraft-testing-save-v4')),
  save_data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, save_key)
);

alter table public.player_saves enable row level security;

revoke all on table public.player_saves from anon, authenticated;
grant select, insert, update, delete on table public.player_saves to authenticated;

drop policy if exists "Players can read their own save" on public.player_saves;
create policy "Players can read their own save"
  on public.player_saves for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Players can create their own save" on public.player_saves;
create policy "Players can create their own save"
  on public.player_saves for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own save" on public.player_saves;
create policy "Players can update their own save"
  on public.player_saves for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Players can delete their own save" on public.player_saves;
create policy "Players can delete their own save"
  on public.player_saves for delete
  to authenticated
  using ((select auth.uid()) = user_id);
