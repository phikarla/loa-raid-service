'use client';
// 클라이언트에서 사용하는 API 래퍼 (로스트아크 공식 오픈 API 기반, 우리 서버를 거쳐서 호출)

export interface RaidCharacterRow {
  job: string;
  role: '딜러' | '서폿';
  synergy: string;
  name: string;
  level: number;
  combatPower?: number;
  owner: string;
}

export async function fetchExpeditionApi(charName: string, repName?: string): Promise<RaidCharacterRow[]> {
  const qs = new URLSearchParams({ charName, ...(repName ? { repName } : {}) });
  const res = await fetch(`/api/lostark/expedition?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '원정대 조회 실패');
  return data.rows as RaidCharacterRow[];
}

export async function fetchCharacterApi(charName: string, repName?: string): Promise<RaidCharacterRow> {
  const qs = new URLSearchParams({ charName, ...(repName ? { repName } : {}) });
  const res = await fetch(`/api/lostark/character?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '캐릭터 조회 실패');
  return data.row as RaidCharacterRow;
}
