import { NextRequest, NextResponse } from 'next/server';
import { getCharacterDataFromLopec } from '../../../../lib/lopecScraper';

export async function GET(req: NextRequest) {
  const charName = req.nextUrl.searchParams.get('charName');
  const repName = req.nextUrl.searchParams.get('repName') || undefined;
  if (!charName) {
    return NextResponse.json({ error: 'charName is required' }, { status: 400 });
  }
  const row = await getCharacterDataFromLopec(charName, {}, repName);
  if (!row) {
    return NextResponse.json({ error: '캐릭터 정보를 찾을 수 없습니다.' }, { status: 404 });
  }
  return NextResponse.json({ row });
}
