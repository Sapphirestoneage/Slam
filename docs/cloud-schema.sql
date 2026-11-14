-- Accounts and spaces for Stress Less About Money (Supabase / Postgres). Run once in the project's SQL editor.
-- One row per person (their list of spaces), one row per space (the packed household file), and who may open it.
create table if not exists accounts (owner uuid primary key default auth.uid() references auth.users, data jsonb not null, updated_at timestamptz default now());
create table if not exists spaces (id text primary key, packed text not null, updated_at timestamptz default now());
create table if not exists space_members (space_id text references spaces(id) on delete cascade, member uuid references auth.users, primary key (space_id, member));
alter table accounts enable row level security; alter table spaces enable row level security; alter table space_members enable row level security;
-- mine: only the owner. shared: only its two members. Nobody else, including other signed-in people.
create policy "own account" on accounts for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy "member reads space" on spaces for select using (exists (select 1 from space_members m where m.space_id = id and m.member = auth.uid()));
create policy "member writes space" on spaces for update using (exists (select 1 from space_members m where m.space_id = id and m.member = auth.uid()));
create policy "anyone signed in creates a space" on spaces for insert with check (auth.uid() is not null);
create policy "see own memberships" on space_members for select using (member = auth.uid());
create policy "join as yourself" on space_members for insert with check (member = auth.uid());
