-- 출석 상태를 "디스코드 계정(guild_members)" 이 아니라 "원정대(expeditions)" 단위로 관리하도록 변경.
-- 이유: 한 명(예: 길드장)이 여러 사람의 원정대를 대신 등록해줄 수 있어서,
-- 등록한 사람(added_by_member_id) != 그 원정대의 실제 주인(대표닉) 인 경우가 흔함.
-- 출석부는 "실제 원정대 대표닉" 기준으로 보여야 함.

alter table public.expeditions add column is_online boolean not null default false;
alter table public.guild_members drop column is_online;
