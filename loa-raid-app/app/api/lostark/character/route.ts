import { NextRequest, NextResponse } from 'next/server';
import { fetchProfile, parseItemLevel } from '../../../../lib/lostark';
import { SUPPORT_CLASSES, getSynergy } from '../../../../lib/raidConfig';

export async function GET(req: NextRequest) {
  const charName = req.nextUrl.searchParams.get('charName');
  const repName = req.nextUrl.searchParams.get('repName') || undefined;
  if (!charName) {
    return NextResponse.json({ error: 'charName is required' }, { status: 400 });
  }

  const profile = await fetchProfile(charName);
  if (!profile) {
    return NextResponse.json({ error: '캐릭터 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  const level = parseItemLevel(profile.ItemAvgLevel);
  const combatPower = parseItemLevel(profile.CombatPower);
  const job = profile.CharacterClassName;
  const role: '딜러' | '서폿' = SUPPORT_CLASSES.includes(job) ? '서폿' : '딜러';

  return NextResponse.json({
    row: {
      job,
      role,
      synergy: getSynergy(job, role),
      name: profile.CharacterName,
      level,
      combatPower,
      owner: repName || charName,
    },
  });
}
