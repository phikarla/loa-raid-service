import { NextRequest, NextResponse } from 'next/server';
import { getExpeditionDataFromLopec } from '../../../../lib/lopecScraper';

export async function GET(req: NextRequest) {
  const charName = req.nextUrl.searchParams.get('charName');
  const repName = req.nextUrl.searchParams.get('repName') || undefined;
  if (!charName) {
    return NextResponse.json({ error: 'charName is required' }, { status: 400 });
  }
  const rows = await getExpeditionDataFromLopec(charName, {}, repName);
  if (!rows) {
    return NextResponse.json(
      { error: '원정대 데이터를 찾을 수 없습니다. (공개 여부 혹은 캐릭터 닉네임 확인 필요)' },
      { status: 404 }
    );
  }
  return NextResponse.json({ rows });
}
