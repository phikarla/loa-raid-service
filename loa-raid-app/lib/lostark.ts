// 로스트아크 공식 오픈 API 클라이언트 (서버 전용 - API 키가 브라우저에 노출되면 안 됨)
const API_BASE = 'https://developer-lostark.game.onstove.com';

function authHeaders() {
  return {
    Authorization: `bearer ${process.env.LOSTARK_API_KEY}`,
    Accept: 'application/json',
  };
}

export interface LostArkSibling {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  ItemAvgLevel: string;
  ItemMaxLevel: string;
}

export interface LostArkProfile {
  CharacterName: string;
  ServerName: string;
  CharacterClassName: string;
  CharacterLevel: number;
  ItemAvgLevel: string;
  ItemMaxLevel: string;
  CombatPower: string;
}

export async function fetchSiblings(characterName: string): Promise<LostArkSibling[] | null> {
  const res = await fetch(`${API_BASE}/characters/${encodeURIComponent(characterName)}/siblings`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProfile(characterName: string): Promise<LostArkProfile | null> {
  const res = await fetch(`${API_BASE}/armories/characters/${encodeURIComponent(characterName)}/profiles`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export function parseItemLevel(value: string | number | null | undefined): number {
  const n = parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}
