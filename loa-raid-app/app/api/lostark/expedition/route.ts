import { NextRequest, NextResponse } from 'next/server';
import { fetchSiblings, fetchProfile, parseItemLevel } from '../../../../lib/lostark';
import { SUPPORT_CLASSES, getSynergy } from '../../../../lib/raidConfig';

export async function GET(req: NextRequest) {
  const charName = req.nextUrl.searchParams.get('charName');
  const repName = req.nextUrl.searchParams.get('repName') || undefined;
  if (!charName) {
    return NextResponse.json({ error: 'charName is required' }, { status: 400 });
  }

  const siblings = await fetchSiblings(charName);
  if (!siblings) {
    return NextResponse.json(
      { error: '원정대 데이터를 찾을 수 없습니다. (닉네임 또는 공개 설정을 확인해 주세요)' },
      { status: 404 }
    );
  }

  const eligible = siblings.filter((s) => parseItemLevel(s.ItemAvgLevel) >= 1700);

  // siblings 응답엔 전투력이 없어서, 1700 이상인 캐릭터만 골라 profiles 를 각각 추가 조회
  const rows = await Promise.all(
    eligible.map(async (s) => {
      const level = parseItemLevel(s.ItemAvgLevel);
      const job = s.CharacterClassName;
      const role: '딜러' | '서폿' = SUPPORT_CLASSES.includes(job) ? '서폿' : '딜러';
      const profile = await fetchProfile(s.CharacterName);
      return {
        job,
        role,
        synergy: getSynergy(job, role),
        name: s.CharacterName,
        level,
        combatPower: profile ? parseItemLevel(profile.CombatPower) : undefined,
        owner: repName || charName,
      };
    })
  );

  return NextResponse.json({ rows });
}
