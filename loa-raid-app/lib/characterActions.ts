'use client';
import { createClient } from '../utils/supabase/client';
import { getSynergy } from './raidConfig';
import type { Character } from './types';
import type { CharacterRow } from './dbTypes';

const supabase = createClient();

interface RegistrantJoin {
  display_name: string;
}

interface ExpeditionJoin {
  id: string;
  added_by_member_id: string;
  registrant: RegistrantJoin | RegistrantJoin[] | null;
}

interface CharacterRowWithExpedition extends CharacterRow {
  expedition: ExpeditionJoin | ExpeditionJoin[] | null;
}

function rowToCharacter(row: CharacterRowWithExpedition): Character {
  const expedition = Array.isArray(row.expedition) ? row.expedition[0] : row.expedition;
  const registrant = expedition?.registrant;
  const registrantObj = Array.isArray(registrant) ? registrant[0] : registrant;
  return {
    id: row.id,
    name: row.name,
    class: row.class,
    level: row.level,
    role: row.role as Character['role'],
    synergy: row.synergy as Character['synergy'],
    combatPower: row.combat_power ?? undefined,
    owner: row.owner_name,
    isGoldGetter: row.is_gold_getter,
    registeredBy: registrantObj?.display_name,
    expeditionId: expedition?.id,
    expeditionAddedBy: expedition?.added_by_member_id,
  };
}

export async function fetchGuildCharacters(guildId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*, expedition:expeditions(id, added_by_member_id, registrant:guild_members(display_name))')
    .eq('guild_id', guildId)
    .order('name');
  if (error) throw error;
  return (data as unknown as CharacterRowWithExpedition[]).map(rowToCharacter);
}

// 원정대(대표닉 기준)가 이미 있으면 그 id를, 없으면 새로 만들어서 id를 반환
async function findOrCreateExpedition(
  guildId: string,
  memberId: string,
  representativeName: string
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('expeditions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('representative_name', representativeName)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('expeditions')
    .insert({ guild_id: guildId, added_by_member_id: memberId, representative_name: representativeName })
    .select('id')
    .single();
  if (createError) throw createError;
  return created.id;
}

// 이미 같은 이름의 캐릭터가 있으면 레벨/전투력 등을 최신으로 갱신하고, 없는 캐릭터만 새로 추가합니다.
export async function addCharactersToGuild(
  guildId: string,
  memberId: string,
  chars: Pick<Character, 'name' | 'class' | 'level' | 'role' | 'synergy' | 'owner' | 'combatPower'>[]
): Promise<Character[]> {
  const { data: existing, error: existingError } = await supabase
    .from('characters')
    .select('id, name, role, synergy')
    .eq('guild_id', guildId);
  if (existingError) throw existingError;

  const existingByName = new Map((existing ?? []).map((r) => [r.name, r]));
  const newOnes = chars.filter((c) => !existingByName.has(c.name));
  const toUpdate = chars.filter((c) => existingByName.has(c.name));

  if (newOnes.length) {
    const expeditionId = await findOrCreateExpedition(guildId, memberId, newOnes[0].owner);
    const rows = newOnes.map((c) => ({
      guild_id: guildId,
      added_by_member_id: memberId,
      expedition_id: expeditionId,
      owner_name: c.owner,
      name: c.name,
      class: c.class,
      level: c.level,
      role: c.role,
      synergy: c.synergy,
      combat_power: c.combatPower ?? null,
    }));
    const { error } = await supabase.from('characters').insert(rows);
    if (error) throw error;
  }

  for (const c of toUpdate) {
    const prev = existingByName.get(c.name)!;
    // 발키리는 재수집해도 기존에 수동으로 정해둔 딜러/서폿 역할을 덮어쓰지 않고 유지
    const role = c.class === '발키리' ? (prev.role as Character['role']) : c.role;
    const synergy = c.class === '발키리' ? ((prev.synergy as Character['synergy']) ?? getSynergy(c.class, role)) : c.synergy;
    await supabase
      .from('characters')
      .update({ class: c.class, level: c.level, role, synergy, combat_power: c.combatPower ?? null })
      .eq('id', prev.id);
    // RLS 상 권한 없으면 0건 갱신되고 에러는 안 남 - 조용히 무시
  }

  return fetchGuildCharacters(guildId);
}

// 단일 캐릭터 검색: 이미 있으면 스탯 갱신 시도(권한 없으면 조용히 무시), 없으면 새로 추가
export async function refreshOrAddCharacter(
  guildId: string,
  memberId: string,
  char: Pick<Character, 'name' | 'class' | 'level' | 'role' | 'synergy' | 'owner' | 'combatPower'>
): Promise<Character[]> {
  const { data: existing, error: existingError } = await supabase
    .from('characters')
    .select('id, role, synergy')
    .eq('guild_id', guildId)
    .eq('name', char.name)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    // 발키리는 재수집해도 기존에 수동으로 정해둔 딜러/서폿 역할을 덮어쓰지 않고 유지
    const role = char.class === '발키리' ? (existing.role as Character['role']) : char.role;
    const synergy =
      char.class === '발키리' ? ((existing.synergy as Character['synergy']) ?? getSynergy(char.class, role)) : char.synergy;
    await supabase
      .from('characters')
      .update({
        class: char.class,
        level: char.level,
        role,
        synergy,
        owner_name: char.owner,
        combat_power: char.combatPower ?? null,
      })
      .eq('id', existing.id);
    // RLS 상 권한 없으면 0건 갱신되고 에러는 안 남 - 조용히 무시
  } else {
    const expeditionId = await findOrCreateExpedition(guildId, memberId, char.owner);
    const { error } = await supabase.from('characters').insert({
      guild_id: guildId,
      added_by_member_id: memberId,
      expedition_id: expeditionId,
      owner_name: char.owner,
      name: char.name,
      class: char.class,
      level: char.level,
      role: char.role,
      synergy: char.synergy,
      combat_power: char.combatPower ?? null,
    });
    if (error) throw error;
  }

  return fetchGuildCharacters(guildId);
}

export async function updateGoldGetter(guildId: string, charId: string, value: boolean): Promise<Character[]> {
  const { error } = await supabase.from('characters').update({ is_gold_getter: value }).eq('id', charId);
  if (error) throw error;
  return fetchGuildCharacters(guildId);
}

// 발키리처럼 딜러/서폿 겸용 직업의 역할을 수동으로 전환 (시너지도 새 역할 기준으로 재계산)
export async function updateCharacterRole(
  guildId: string,
  charId: string,
  job: string,
  newRole: Character['role']
): Promise<Character[]> {
  const synergy = getSynergy(job, newRole);
  const { error } = await supabase.from('characters').update({ role: newRole, synergy }).eq('id', charId);
  if (error) throw error;
  return fetchGuildCharacters(guildId);
}

// 캐릭터 카드 한 장만 다른 원정대(소유주)로 이관 (원정대 전체 병합과 달리, 이 캐릭터 하나만 옮기고
// 원래 소속돼 있던 원정대는 그대로 유지됨 - 등록 실수로 엉뚱한 원정대에 들어간 캐릭터를 바로잡을 때 씀)
export async function moveCharacterToOwner(guildId: string, charId: string, newOwnerName: string): Promise<Character[]> {
  const { data: targetExp, error: targetError } = await supabase
    .from('expeditions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('representative_name', newOwnerName)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetExp) throw new Error('대상 원정대를 찾을 수 없습니다.');

  const { error } = await supabase
    .from('characters')
    .update({ owner_name: newOwnerName, expedition_id: targetExp.id })
    .eq('id', charId);
  if (error) throw error;
  // RLS 상 권한 없으면 0건 갱신되고 에러는 안 남 - 조용히 무시

  return fetchGuildCharacters(guildId);
}

export async function updateCombatPower(guildId: string, charId: string, value: number | null): Promise<Character[]> {
  const { error } = await supabase.from('characters').update({ combat_power: value }).eq('id', charId);
  if (error) throw error;
  return fetchGuildCharacters(guildId);
}

export async function deleteCharacterRow(guildId: string, charId: string): Promise<Character[]> {
  const { error } = await supabase.from('characters').delete().eq('id', charId);
  if (error) throw error;
  return fetchGuildCharacters(guildId);
}

export async function deleteAllCharacters(guildId: string): Promise<Character[]> {
  const { error } = await supabase.from('characters').delete().eq('guild_id', guildId);
  if (error) throw error;
  return fetchGuildCharacters(guildId);
}
