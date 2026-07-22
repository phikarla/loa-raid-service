'use client';
// 클라이언트에서 사용하는 API 래퍼 (구 google.script.run 호출부 대체)
import type { LopecCharacterRow } from './lopecScraper';

export async function fetchExpeditionApi(charName: string, repName?: string): Promise<LopecCharacterRow[]> {
  const qs = new URLSearchParams({ charName, ...(repName ? { repName } : {}) });
  const res = await fetch(`/api/lopec/expedition?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '원정대 조회 실패');
  return data.rows as LopecCharacterRow[];
}

export async function fetchCharacterApi(charName: string, repName?: string): Promise<LopecCharacterRow> {
  const qs = new URLSearchParams({ charName, ...(repName ? { repName } : {}) });
  const res = await fetch(`/api/lopec/character?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '캐릭터 조회 실패');
  return data.row as LopecCharacterRow;
}
