// 사과_4(Apps Script) Code.gs 이식 - lopec.kr 비공식 스크래핑 모듈
// ⚠️ 추후 로스트아크 정식 오픈 API 로 교체될 예정이므로, 이 파일 하나만 교체하면 되도록 격리했습니다.
import { SUPPORT_CLASSES, getSynergy } from './raidConfig';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export interface LopecCharacterRow {
  job: string;
  role: '딜러' | '서폿';
  synergy: string;
  name: string;
  level: number;
  lopecScore: number;
  ingameScore: number;
  owner: string;
}

interface RawExpeditionChar {
  nickname: string;
  characterClass: string;
  itemLevel: string | number;
}

async function fetchLopec(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { RSC: '1', 'User-Agent': UA },
    // lopec.kr 은 Next.js RSC 페이로드를 반환하므로 캐시하지 않음
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.text();
}

// Next.js RSC 스트리밍 응답 속에 박혀있는 "data":[...] 배열을 괄호 매칭으로 추출
function extractJsonArray(text: string): RawExpeditionChar[] | null {
  let dataStart = text.indexOf('"data":[[');
  if (dataStart === -1) dataStart = text.indexOf('"data":[{');
  if (dataStart === -1) return null;

  const startIdx = text.indexOf('[', dataStart);
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  try {
    return JSON.parse(text.slice(startIdx, endIdx));
  } catch {
    return null;
  }
}

export async function getSpecPointData(charName: string): Promise<{ lopecScore: number; ingameScore: number }> {
  try {
    const url = `https://lopec.kr/character/specPoint/${encodeURIComponent(charName)}`;
    const rawHtml = await fetchLopec(url);
    if (!rawHtml) return { lopecScore: 0, ingameScore: 0 };

    const lopecMatch = rawHtml.match(
      /달성 최고 점수<\/span>[\s\S]*?<span class="DetailSpec_value__[^"]*"[^>]*>([\d,.]+)<\/span>/
    );
    const lopecScore = lopecMatch ? parseFloat(lopecMatch[1].replace(/,/g, '')) : 0;

    const ingameMatch = rawHtml.match(
      /인게임 전투력<\/span>[\s\S]*?<span class="DetailSpec_value__[^"]*"[^>]*>([\d,.]+)<\/span>/
    );
    const ingameScore = ingameMatch ? parseFloat(ingameMatch[1].replace(/,/g, '')) : 0;

    return { lopecScore, ingameScore };
  } catch {
    return { lopecScore: 0, ingameScore: 0 };
  }
}

// [버튼1] 대표 캐릭터명으로 원정대 전체 크롤링 (1700 이상 전체)
export async function getExpeditionDataFromLopec(
  charName: string,
  existingRoles: Record<string, string> = {},
  repName?: string
): Promise<LopecCharacterRow[] | null> {
  try {
    const url = `https://lopec.kr/character/expedition/${encodeURIComponent(charName)}`;
    const text = await fetchLopec(url);
    if (!text) return null;

    const charArray = extractJsonArray(text);
    if (!charArray) return null;

    const rows: LopecCharacterRow[] = [];
    for (const ch of charArray) {
      const level = parseFloat(String(ch.itemLevel));
      if (!Number.isFinite(level) || level < 1700) continue;
      const name = ch.nickname;
      const job = ch.characterClass;
      const role: '딜러' | '서폿' =
        (existingRoles[name] as '딜러' | '서폿') || (SUPPORT_CLASSES.includes(job) ? '서폿' : '딜러');
      const spec = await getSpecPointData(name);
      rows.push({
        job,
        role,
        synergy: getSynergy(job, role),
        name,
        level,
        lopecScore: spec.lopecScore,
        ingameScore: spec.ingameScore,
        owner: repName || charName,
      });
    }
    return rows;
  } catch (e) {
    console.error('getExpeditionDataFromLopec 오류:', e);
    return null;
  }
}

// [버튼2] 개별 캐릭터 정보 갱신 (해당 캐릭터 1명만 정확히 재조회)
export async function getCharacterDataFromLopec(
  charName: string,
  existingRoles: Record<string, string> = {},
  repName?: string
): Promise<LopecCharacterRow | null> {
  try {
    const url = `https://lopec.kr/character/expedition/${encodeURIComponent(charName)}`;
    const text = await fetchLopec(url);
    if (!text) return null;

    const charArray = extractJsonArray(text);
    if (!charArray) return null;

    const target = charArray.find((c) => c.nickname === charName) || charArray[0];
    if (!target) return null;

    const level = parseFloat(String(target.itemLevel));
    const job = target.characterClass;
    const role: '딜러' | '서폿' =
      (existingRoles[charName] as '딜러' | '서폿') || (SUPPORT_CLASSES.includes(job) ? '서폿' : '딜러');
    const spec = await getSpecPointData(charName);

    return {
      job,
      role,
      synergy: getSynergy(job, role),
      name: charName,
      level,
      lopecScore: spec.lopecScore,
      ingameScore: spec.ingameScore,
      owner: repName || charName,
    };
  } catch (e) {
    console.error('getCharacterDataFromLopec 오류:', e);
    return null;
  }
}
