-- editor 역할 추가: 길드장이 특정 멤버에게 편집권을 위임할 수 있게 함
-- ⚠️ Supabase SQL Editor에서 이 파일은 반드시 "두 번에 나눠서" 실행하세요.
--   1) 아래 "STEP 1" 블록만 먼저 붙여넣고 Run
--   2) 성공하면 "STEP 2" 블록을 붙여넣고 Run
-- (같은 트랜잭션 안에서 새 enum 값을 바로 정책에 쓰면 Postgres가 에러를 내기 때문)

-- ===================== STEP 1 =====================
alter type public.guild_role add value 'editor';
-- ===================== STEP 1 끝 =====================


-- ===================== STEP 2 =====================
-- owner 또는 editor 인지 확인하는 헬퍼 (raid_formations/characters 편집 권한 체크용)
create or replace function public.can_edit_guild(g uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.guild_members
    where guild_id = g and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

-- characters: 등록자 본인이거나 owner/editor 면 수정/삭제 가능하도록 갱신
drop policy if exists "characters_update_owner_or_self" on public.characters;
create policy "characters_update_owner_or_self" on public.characters
  for update using (added_by_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));

drop policy if exists "characters_delete_owner_or_self" on public.characters;
create policy "characters_delete_owner_or_self" on public.characters
  for delete using (added_by_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));

-- raid_formations: 편집은 owner/editor 모두 가능하도록 갱신 (기존엔 owner 전용이었음)
drop policy if exists "raid_formations_write_owner" on public.raid_formations;
create policy "raid_formations_write_editor" on public.raid_formations
  for all using (public.can_edit_guild(guild_id)) with check (public.can_edit_guild(guild_id));

-- suggestions: owner/editor 는 아무 건의사항이나 수정/삭제 가능하도록 갱신
drop policy if exists "suggestions_update_owner_or_self" on public.suggestions;
create policy "suggestions_update_owner_or_self" on public.suggestions
  for update using (author_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));

drop policy if exists "suggestions_delete_owner_or_self" on public.suggestions;
create policy "suggestions_delete_owner_or_self" on public.suggestions
  for delete using (author_member_id = public.my_member_id(guild_id) or public.can_edit_guild(guild_id));

-- 길드장 전용 RPC: 특정 멤버에게 editor 권한 부여/회수 (owner 자신은 대상이 될 수 없음)
create or replace function public.set_member_editor(target_member_id uuid, make_editor boolean)
returns void language plpgsql security definer as $$
declare
  g uuid;
begin
  select guild_id into g from public.guild_members where id = target_member_id;
  if g is null then
    raise exception '멤버를 찾을 수 없습니다.';
  end if;
  if not public.is_guild_owner(g) then
    raise exception '권한이 없습니다.';
  end if;

  update public.guild_members
    set role = case when make_editor then 'editor'::guild_role else 'member'::guild_role end
    where id = target_member_id and role <> 'owner';
end;
$$;
-- ===================== STEP 2 끝 =====================
