import { NextRequest, NextResponse } from 'next/server';
import type { AppSnapshot } from '../../../lib/types';

// ⚠️ 임시 인메모리 저장소입니다. Apps Script 의 PropertiesService 를 대체하는 자리표시자로,
// 서버 재시작/다중 인스턴스 환경에서는 데이터가 유지되지 않습니다.
// 추후 Supabase 테이블(예: app_state)로 교체 예정입니다.
declare global {
  // eslint-disable-next-line no-var
  var __RAID_STATE__: { snapshot: AppSnapshot | null; updatedAt: number } | undefined;
}

if (!global.__RAID_STATE__) {
  global.__RAID_STATE__ = { snapshot: null, updatedAt: 0 };
}

export async function GET() {
  const store = global.__RAID_STATE__!;
  return NextResponse.json({ snapshot: store.snapshot, updatedAt: store.updatedAt });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AppSnapshot;
  const store = global.__RAID_STATE__!;
  store.snapshot = body;
  store.updatedAt = Date.now();
  return NextResponse.json({ ok: true, updatedAt: store.updatedAt });
}
