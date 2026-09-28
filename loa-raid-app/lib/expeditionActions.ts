'use client';
import { createClient } from '../utils/supabase/client';
import { fetchGuildCharacters } from './characterActions';
import type { Character } from './types';

const supabase = createClient();

// 부계 원정대(sourceOwnerName)를 본계 원정대(targetOwnerName)로 병합
// - source 소속 캐릭터들을 전부 target 소속으로 옮기고, source 원정대 레코드는 삭제
// - RLS 상 권한 없는 캐릭터는 조용히 그대로 남음(0건 갱신)
export async function mergeExpeditions(
  guildId: string,
  sourceOwnerName: string,
  targetOwnerName: string
): Promise<{ characters: Character[]; movedCount: number }> {
  if (sourceOwnerName === targetOwnerName) {
    return { characters: await fetchGuildCharacters(guildId), movedCount: 0 };
  }

  const { data: targetExp, error: targetError } = await supabase
    .from('expeditions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('representative_name', targetOwnerName)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!targetExp) throw new Error('대상 원정대를 찾을 수 없습니다.');

  const { data: updated, error: updateError } = await supabase
    .from('characters')
    .update({ owner_name: targetOwnerName, expedition_id: targetExp.id })
    .eq('guild_id', guildId)
    .eq('owner_name', sourceOwnerName)
    .select('id');
  if (updateError) throw updateError;

  const { data: sourceExp } = await supabase
    .from('expeditions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('representative_name', sourceOwnerName)
    .maybeSingle();
  if (sourceExp) {
    await supabase.from('expeditions').delete().eq('id', sourceExp.id);
  }

  return { characters: await fetchGuildCharacters(guildId), movedCount: updated?.length ?? 0 };
}

// 원정대(대표닉) 카드 전체 삭제 - 소속 캐릭터 전부 + 원정대 레코드 삭제.
// 등록자 본인 또는 길드장/편집자만 실제로 삭제됨(RLS) - 권한 없으면 0건 삭제되고 에러는 안 남.
export async function deleteExpedition(guildId: string, ownerName: string): Promise<{ characters: Character[]; deletedCount: number }> {
  const { data: deleted, error: charError } = await supabase
    .from('characters')
    .delete()
    .eq('guild_id', guildId)
    .eq('owner_name', ownerName)
    .select('id');
  if (charError) throw charError;

  const { data: exp } = await supabase
    .from('expeditions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('representative_name', ownerName)
    .maybeSingle();
  if (exp) {
    await supabase.from('expeditions').delete().eq('id', exp.id);
  }

  return { characters: await fetchGuildCharacters(guildId), deletedCount: deleted?.length ?? 0 };
}

// 원정대(대표닉) 단위 출석 상태 토글. 등록자 본인 또는 길드장/편집자만 실제로 반영됨(RLS).
export async function setExpeditionOnline(expeditionId: string, isOnline: boolean) {
  const { error } = await supabase.from('expeditions').update({ is_online: isOnline }).eq('id', expeditionId);
  if (error) throw error;
}

// 길드 페이지 최초 로드시 "현재 출석 중인 원정대 목록"을 이름 배열로 가져옴
export async function fetchOnlineExpeditionNames(guildId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('expeditions')
    .select('representative_name')
    .eq('guild_id', guildId)
    .eq('is_online', true);
  if (error) throw error;
  return (data ?? []).map((r) => r.representative_name);
}
