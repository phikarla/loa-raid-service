// Supabase DB 행 타입 (supabase/migrations/0001_init.sql 과 1:1 대응)
// lib/types.ts 의 클라이언트 상태 타입(Character, Party 등)과는 별개로 유지.
// DB 연동 API 라우트/서버 코드에서 이 타입들을 사용.

export type GuildRole = "owner" | "editor" | "member";

export interface Guild {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface GuildMember {
  id: string;
  guild_id: string;
  user_id: string;
  role: GuildRole;
  display_name: string;
  color: string | null;
  joined_at: string;
}

export interface Expedition {
  id: string;
  guild_id: string;
  added_by_member_id: string;
  representative_name: string;
  is_online: boolean;
  created_at: string;
}

export interface CharacterRow {
  id: string;
  guild_id: string;
  added_by_member_id: string;
  expedition_id: string | null;
  owner_name: string;
  name: string;
  class: string;
  level: number;
  role: string; // "딜러" | "서폿"
  synergy: string;
  combat_power: number | null;
  is_gold_getter: boolean;
  updated_at: string;
}

export interface RaidFormationRow {
  guild_id: string;
  raid_name: string;
  data: unknown; // RaidFormation (lib/types.ts) 을 JSON 으로 저장
  updated_at: string;
}

export interface SuggestionRow {
  id: string;
  guild_id: string;
  author_member_id: string;
  content: string;
  created_at: string;
}
