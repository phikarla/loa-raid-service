-- 원정대(expedition)를 별도 엔티티로 분리
-- 한 사람(guild_member)은 여러 원정대를 가질 수 있고, 원정대 하나엔 캐릭터가 여러 개 있음

create table public.expeditions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  added_by_member_id uuid not null references public.guild_members(id) on delete cascade,
  representative_name text not null,
  created_at timestamptz not null default now(),
  unique (guild_id, representative_name)
);

alter table public.characters add column expedition_id uuid references public.expeditions(id) on delete cascade;

alter table public.expeditions enable row level security;

create policy "expeditions_select_same_guild" on public.expeditions
  for select using (public.is_guild_member(guild_id));

create policy "expeditions_insert_self" on public.expeditions
  for insert with check (added_by_member_id = public.my_member_id(guild_id));

create policy "expeditions_update_owner_or_self" on public.expeditions
  for update using (added_by_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));

create policy "expeditions_delete_owner_or_self" on public.expeditions
  for delete using (added_by_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));
