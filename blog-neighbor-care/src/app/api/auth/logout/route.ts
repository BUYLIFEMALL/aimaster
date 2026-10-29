import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  const expectedOrigin = `${request.nextUrl.protocol}//${request.headers.get('host') ?? request.nextUrl.host}`;
  if (request.headers.get('origin') !== expectedOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: '요청 출처를 확인할 수 없습니다.' }, { status: 403, headers });
  }
  try {
    const { error } = await (await createClient()).auth.signOut({ scope: 'local' });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: '로그아웃하지 못했습니다. 다시 시도해 주세요.' }, { status: 503, headers });
  }
}
