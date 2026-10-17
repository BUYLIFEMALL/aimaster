import { NextResponse } from 'next/server';
import { checkProgramAccessApi } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { FAVORITE_TTL_MS, sanitizeFavorite, validId, validKind } from '@/lib/favorites';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const db = createAdminClient();
  const { data, error } = await db.from('yvs_favorites').select('item_type,item_id,payload,created_at').eq('user_id', access.user.id).gt('created_at', new Date(Date.now() - FAVORITE_TTL_MS).toISOString()).order('created_at', { ascending: false }).limit(1000);
  if (error) return json({ error: '보관함을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }, 503);
  const favorites = (data ?? []).flatMap(row => {
    try { if (!validKind(row.item_type) || row.payload?.id !== row.item_id) return []; return [{ ...row, payload: sanitizeFavorite(row.item_type, row.payload) }]; } catch { return []; }
  });
  return json({ favorites, limit: 1000, serverNow: new Date().toISOString() });
}

async function mutate(request: Request, deleting: boolean) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      // Next may normalize request.url to localhost behind the proxy. Host is
      // the browser-facing destination; never use the Origin itself as target.
      const targetHost = request.headers.get('host') || new URL(request.url).host;
      const source = new URL(origin);
      if (!['http:', 'https:'].includes(source.protocol) || source.host !== targetHost) return json({ error: '허용되지 않은 요청입니다.' }, 403);
    } catch { return json({ error: '허용되지 않은 요청입니다.' }, 403); }
  }
  if (Number(request.headers.get('content-length') || 0) > 65536) return json({ error: '자료가 너무 큽니다.' }, 413);
  let body: { type?: unknown; id?: unknown; item?: unknown };
  try { const raw = await request.text(); if (raw.length > 65536) return json({ error: '자료가 너무 큽니다.' }, 413); body = JSON.parse(raw); } catch { return json({ error: '요청 형식이 올바르지 않습니다.' }, 400); }
  if (!body || !validKind(body.type)) return json({ error: '영상 또는 채널을 선택해주세요.' }, 400);
  const db = createAdminClient(), owner = access.user.id;
  if (deleting) {
    if (!validId(body.id)) return json({ error: '삭제할 항목 ID가 필요합니다.' }, 400);
    const { error } = await db.from('yvs_favorites').delete().eq('user_id', owner).eq('item_type', body.type).eq('item_id', body.id);
    return error ? json({ error: '해제하지 못했습니다. 다시 시도해주세요.' }, 503) : json({ success: true });
  }
  let payload;
  try { payload = sanitizeFavorite(body.type, body.item); } catch (e) { return json({ error: e instanceof Error ? e.message : '자료가 올바르지 않습니다.' }, 400); }
  const { error: expiredError } = await db.from('yvs_favorites').delete().eq('user_id', owner).eq('item_type', body.type).eq('item_id', payload.id).lte('created_at', new Date(Date.now() - FAVORITE_TTL_MS).toISOString());
  if (expiredError) return json({ error: '만료 자료를 정리하지 못했습니다.' }, 503);
  // Ignore duplicate inserts: created_at is assigned by DB once, never refreshed.
  const { error } = await db.from('yvs_favorites').upsert({ user_id: owner, item_type: body.type, item_id: payload.id, payload }, { onConflict: 'user_id,item_type,item_id', ignoreDuplicates: true });
  return error ? json({ error: '보관하지 못했습니다. 다시 시도해주세요.' }, 503) : json({ success: true });
}
export const POST = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
