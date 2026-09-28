-- 로아 레이드 매니저: 멀티테넌시(길드 단위) 스키마
-- 권한 모델: guild_members.role = 'owner'(길드장, 전권) | 'member'(본인 관련 항목만)

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────
-- profiles: Discord 로그인 유저 (auth.users 1:1 확장)
-- ─────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  discord_username text not null,
  discord_avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────
-- guilds: 길드(그룹) 단위
-- ─────────────────────────────────────────────────────────
create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create type public.guild_role as enum ('owner', 'member');

create table public.guild_members (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.guild_role not null default 'member',
  display_name text not null,
  color text,
  is_online boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (guild_id, user_id)
);

-- ─────────────────────────────────────────────────────────
-- characters: 길드별 캐릭터 풀
-- owner_name = lopec 에서 긁어온 "원정대 대표닉" (표시/그룹핑용, 로그인 계정과 무관할 수 있음)
-- added_by_member_id = 실제 등록/수정 권한을 가진 guild_members 행
-- ─────────────────────────────────────────────────────────
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  added_by_member_id uuid not null references public.guild_members(id) on delete cascade,
  owner_name text not null,
  name text not null,
  class text not null,
  level numeric not null default 0,
  role text not null,
  synergy text not null,
  lopec_score numeric,
  ingame_score numeric,
  is_gold_getter boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- raid_formations: 파티/공격대 편성 (트리 구조라 JSON 그대로 저장, 길드장 전용 편집)
-- ─────────────────────────────────────────────────────────
create table public.raid_formations (
  guild_id uuid not null references public.guilds(id) on delete cascade,
  raid_name text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (guild_id, raid_name)
);

-- ─────────────────────────────────────────────────────────
-- suggestions: 건의사항 게시판
-- ─────────────────────────────────────────────────────────
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  author_member_id uuid not null references public.guild_members(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────
-- 권한 체크 헬퍼 (security definer: RLS 재귀 문제 없이 조회)
-- ─────────────────────────────────────────────────────────
create or replace function public.is_guild_member(g uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = g and user_id = auth.uid()
  );
$$;

create or replace function public.is_guild_owner(g uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = g and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.my_member_id(g uuid)
returns uuid language sql security definer stable as $$
  select id from public.guild_members
  where guild_id = g and user_id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────
-- 길드 생성 / 초대코드로 가입 (RPC, 클라이언트에서 직접 insert 금지)
-- ─────────────────────────────────────────────────────────
create or replace function public.create_guild(guild_name text, my_display_name text)
returns public.guilds language plpgsql security definer as $$
declare
  new_guild public.guilds;
  code text;
begin
  code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  insert into public.guilds (name, invite_code, owner_id)
  values (guild_name, code, auth.uid())
  returning * into new_guild;

  insert into public.guild_members (guild_id, user_id, role, display_name)
  values (new_guild.id, auth.uid(), 'owner', my_display_name);

  return new_guild;
end;
$$;

create or replace function public.join_guild_by_invite_code(code text, my_display_name text)
returns public.guilds language plpgsql security definer as $$
declare
  target public.guilds;
begin
  select * into target from public.guilds where invite_code = code;
  if not found then
    raise exception '초대 코드를 찾을 수 없습니다.';
  end if;

  insert into public.guild_members (guild_id, user_id, role, display_name)
  values (target.id, auth.uid(), 'member', my_display_name)
  on conflict (guild_id, user_id) do nothing;

  return target;
end;
$$;

-- ─────────────────────────────────────────────────────────
-- RLS 활성화
-- ─────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.characters enable row level security;
alter table public.raid_formations enable row level security;
alter table public.suggestions enable row level security;

-- profiles: 본인 행만 조회/수정
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- guilds: 소속된 길드만 조회, 생성/가입은 RPC 로만
create policy "guilds_select_member" on public.guilds
  for select using (public.is_guild_member(id));
create policy "guilds_update_owner" on public.guilds
  for update using (public.is_guild_owner(id));

-- guild_members: 같은 길드 멤버끼리는 서로 조회 가능
create policy "guild_members_select_same_guild" on public.guild_members
  for select using (public.is_guild_member(guild_id));
-- 본인 행(출석 등)은 본인이 수정, 나머지(역할 변경 등)는 길드장이 수정
create policy "guild_members_update_self_or_owner" on public.guild_members
  for update using (user_id = auth.uid() or public.is_guild_owner(guild_id));
create policy "guild_members_delete_owner" on public.guild_members
  for delete using (public.is_guild_owner(guild_id));

-- characters: 같은 길드면 조회 가능
create policy "characters_select_same_guild" on public.characters
  for select using (public.is_guild_member(guild_id));
-- 등록은 본인 member_id 로만
create policy "characters_insert_self" on public.characters
  for insert with check (added_by_member_id = public.my_member_id(guild_id));
-- 수정/삭제는 등록자 본인이거나 길드장
create policy "characters_update_owner_or_self" on public.characters
  for update using (added_by_member_id = public.my_member_id(guild_id) or public.is_guild_owner(guild_id));
create policy "characters_delete_owner_or_self" on public.characters
  for delete using (added_by_member_id = public.my_member_id(guild_id) or public.is_guild_owner(guild_id));

-- raid_formations: 조회는 길드원 전체, 편집은 길드장 전용
create policy "raid_formations_select_same_guild" on public.raid_formations
  for select using (public.is_guild_member(guild_id));
create policy "raid_formations_write_owner" on public.raid_formations
  for all using (public.is_guild_owner(guild_id)) with check (public.is_guild_owner(guild_id));

-- suggestions: 조회는 길드원 전체, 작성은 본인, 수정/삭제는 본인 또는 길드장
create policy "suggestions_select_same_guild" on public.suggestions
  for select using (public.is_guild_member(guild_id));
create policy "suggestions_insert_self" on public.suggestions
  for insert with check (author_member_id = public.my_member_id(guild_id));
create policy "suggestions_update_owner_or_self" on public.suggestions
  for update using (author_member_id = public.my_member_id(guild_id) or public.is_guild_owner(guild_id));
create policy "suggestions_delete_owner_or_self" on public.suggestions
  for delete using (author_member_id = public.my_member_id(guild_id) or public.is_guild_owner(guild_id));
