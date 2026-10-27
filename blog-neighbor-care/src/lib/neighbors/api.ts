import type { Access } from '../work-api';
import { relationshipEvidence, type RelationRow } from '../search/evidence';
export type Account = { id: string; blogId: string };
export type NeighborStore = {
  accounts: (userId: string) => Promise<Account[]>;
  account: (userId: string, accountId: string) => Promise<Account | null>;
  rows: (userId: string, accountId: string, cursor: string | null) => Promise<RelationRow[]>;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const blog = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9_-]{1,50}$/.test(v);
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'private, no-store', vary: 'Cookie, Origin' } });
export function createNeighborHandler(member: () => Promise<Access>, store: NeighborStore, now = Date.now) {
  return async (request: Request) => {
    if (request.method !== 'POST') return reply({ error: 'POST 요청이 필요합니다.' }, 405);
    try {
      const access = await member(); if (!access.allowed) return reply({ error: access.error }, access.status);
      const url = new URL(request.url), host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
      const protocol = request.headers.get('x-forwarded-proto') || url.protocol.slice(0,-1);
      if (request.headers.get('origin') !== `${protocol}://${host}` || request.headers.get('sec-fetch-site') === 'cross-site') return reply({ error: '프로그램 화면에서 조회해 주세요.' }, 403);
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ error: 'JSON 요청이 필요합니다.' }, 415);
      const reader = request.body?.getReader(); if (!reader) return reply({ error: '조회 조건을 확인해 주세요.' }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); return reply({ error: '조회 조건이 너무 큽니다.' },413); } chunks.push(value); }
      let input: unknown; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply({ error: '조회 조건을 확인해 주세요.' },400); }
      if (!record(input) || Object.keys(input).some(k => !['operation','accountId','cursor'].includes(k))) return reply({ error: '조회 조건을 확인해 주세요.' },400);
      let data: unknown;
      if (input.operation === 'accounts') {
        if (Object.keys(input).length !== 1) return reply({ error: '조회 조건을 확인해 주세요.' },400);
        const accounts = (await store.accounts(access.userId)).filter(a=>uuid(a.id)&&blog(a.blogId));
        data = { accounts: accounts.slice(0,20), truncated: accounts.length > 20 };
      } else if (input.operation === 'list') {
        if (!uuid(input.accountId) || ('cursor' in input && input.cursor !== null && !blog(input.cursor))) return reply({ error: '계정·이전 조회 위치를 확인해 주세요.' },400);
        const account = await store.account(access.userId,input.accountId);
        if (!account || !blog(account.blogId)) return reply({ error: '연결된 본인 블로그 계정이 없습니다.' },404);
        const rows = await store.rows(access.userId,account.id,(input.cursor as string | null) || null);
        if (rows.length > 51 || rows.some(row => !blog(row.neighbor_id)) || new Set(rows.map(row=>row.neighbor_id)).size !== rows.length) throw new Error('Invalid records');
        const current = await store.account(access.userId,account.id);
        if (!current || current.blogId !== account.blogId) return reply({ error: '조회 중 계정 연결이 변경됐습니다.' },409);
        const at = now(), page = rows.slice(0,50);
        data = { account, records: page.map(row=>({blogId:row.neighbor_id,relationship:relationshipEvidence([row],row.neighbor_id,at)})),
          nextCursor: rows.length > 50 ? page.at(-1)!.neighbor_id : null, observedAt: new Date(at).toISOString(),
          scope: 'stored-records-only', naverListImported: false, canAutoEngage: false, externalActions: 0 };
      } else return reply({ error: '지원하는 조회 요청이 아닙니다.' },400);
      const after = await member(); if (!after.allowed) return reply({ error: after.error },after.status);
      if (after.userId !== access.userId) return reply({ error: '로그인 계정을 다시 확인해 주세요.' },403);
      return reply({ data });
    } catch { return reply({ error: '관계 기록을 조회하지 못했습니다. 자동으로 다시 요청하지 않습니다.' },503); }
  };
}
