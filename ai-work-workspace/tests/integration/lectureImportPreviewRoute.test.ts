// 강의 일정 미리보기 — 공개 HTTP 진입점(/api/rpc/[name] POST)부터의 시험. 2026-11-20 WS-LECTURE-PREVIEW-ONLY A2(Master msg_e9dda18e3075).
// 확인: 인증·권한·계정 확인은 다른 명령과 같고, 이 명령만 회원 AI 키 조회·모델 목록 예열(외부 호출)·정시 작업 추적·응답 뒤 afterRpc를
// 하지 않는다. 외부 호출(fetch·Supabase 관리 접속) 0, DB 0쓰기(모든 표의 줄 수·내용 해시 전후 비교). 다른 명령은 예전처럼 그 일을 한다.
// 자료는 익명 합성 값. 로컬 Postgres 전용 fixture만 쓴다. 실키·실네트워크 0.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const h = vi.hoisted(() => ({
  session: null as null | { id: string; email: string },
  pre: { aiKeys: 0, warm: 0, jobs: 0, after: 0, afterRpc: 0, admin: 0, fetch: 0 },
}));
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => { h.pre.after++; } }));
vi.mock('@/lib/access', () => ({
  checkProgramAccessApi: async () => (h.session ? { allowed: true, user: h.session } : { allowed: false, status: 401, error: '로그인이 필요합니다.' }),
}));
vi.mock('@/server/member', () => ({ memberFromUser: (u: { id: string; email: string }) => ({ id: u.id, email: u.email, name: '진입점시험' }) }));
vi.mock('@/server/memberJobs', () => ({ trackMemberJobs: async (fn: () => Promise<unknown>) => { h.pre.jobs++; return { result: await fn(), scheduled: false }; } }));
vi.mock('@/server/memberScheduling', () => ({ afterRpc: async () => { h.pre.afterRpc++; } }));
vi.mock('@/server/memberAiKeys', () => ({ loadMemberAiKeys: async () => { h.pre.aiKeys++; return {}; } }));
vi.mock('@/litpage/server/ai/models.ts', async (orig) => ({ ...(await orig<typeof import('../../src/litpage/server/ai/models.ts')>()), warmModelLists: async () => { h.pre.warm++; } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => { h.pre.admin++; throw new Error('실제 Supabase 접근 금지(시험)'); } }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { signOut: async () => ({}) } }) }));

let POST: typeof import('../../src/app/api/rpc/[name]/route.ts').POST;
let NextRequestCtor: typeof import('next/server').NextRequest;
let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let ratelimit: typeof import('../../src/litpage/server/ratelimit.ts');

const kim = { id: 'bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc', email: 'route-kim@example.com', name: '킴' };
const lee = { id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd', email: 'route-lee@example.com', name: '리' };
const fresh = { id: 'dededede-dede-4ede-8ede-dededededede', email: 'route-fresh@example.com', name: '새' };
const spaces = new Map<string, string>();
const realFetch = globalThis.fetch;

beforeAll(async () => {
  ({ POST } = await import('../../src/app/api/rpc/[name]/route.ts'));
  ({ NextRequest: NextRequestCtor } = await import('next/server'));
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  ratelimit = await import('../../src/litpage/server/ratelimit.ts');
  for (const m of [kim, lee]) {
    await runtime.runRpc('loadAccountData', {}, m);
    const r = await runtime.runRpc('createWorkspace', { name: `${m.name} 진입점 시험` }, m);
    spaces.set(m.id, (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id);
  }
  globalThis.fetch = (async () => { h.pre.fetch++; throw new Error('외부 호출 금지(시험)'); }) as typeof fetch;
});
afterAll(() => { globalThis.fetch = realFetch; });
beforeEach(() => {
  h.pre = { aiKeys: 0, warm: 0, jobs: 0, after: 0, afterRpc: 0, admin: 0, fetch: 0 };
  h.session = { id: kim.id, email: kim.email };
  runtime.setLecturePreviewTestOverrides({});
  for (const m of [kim, lee, fresh]) ratelimit.reset(`lecture-preview:${m.id}`);
});

const csv = (rows: string[][]) => '﻿' + [['제목', '날짜'], ...rows].map((r) => r.join(',')).join('\r\n') + '\r\n';
const store = (m: typeof kim, text: string) => db.withRequestCache(() => files.storeFile('lecture.csv', Buffer.from(text, 'utf8'), m.id, spaces.get(m.id)!, 'text/csv'));
const body = (url: string, over: Record<string, unknown> = {}) => ({ spaceId: spaces.get(kim.id), url, name: 'lecture.csv', target: { kind: 'new' }, mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', wallClock: false, ...over });
async function call(name: string, payload: unknown) {
  const res = await POST(new NextRequestCtor(`http://localhost/api/rpc/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(payload) }), { params: Promise.resolve({ name }) });
  return { status: res.status, body: await res.json() as any };
}
function snapshot(): Record<string, string> {
  const tables = db.db.prepare("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY 1").all() as { t: string }[];
  const out: Record<string, string> = {};
  for (const { t } of tables) {
    const r = db.db.prepare(`SELECT count(*)::int AS n, md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM "${t}" x`).get() as { n: number; h: string };
    out[t] = `${r.n}:${r.h}`;
  }
  return out;
}
const quiet = () => expect(h.pre).toEqual({ aiKeys: 0, warm: 0, jobs: 0, after: 0, afterRpc: 0, admin: 0, fetch: 0 });

describe('공개 진입점 → previewLectureImport', () => {
  it('성공(키 없음·키 있음): 200, AI 키·모델 목록·정시 작업·afterRpc·외부 호출 0, DB 0쓰기', async () => {
    const f = store(kim, csv([['합성 강의', '2026년 3월 1일 오후 7:30 (GMT+9)']]));
    for (const key of [undefined, new Uint8Array(32).fill(5)]) {
      runtime.setLecturePreviewTestOverrides(key ? { key } : {});
      h.pre = { aiKeys: 0, warm: 0, jobs: 0, after: 0, afterRpc: 0, admin: 0, fetch: 0 };
      const before = snapshot();
      const r = await call('previewLectureImport', body(f.url));
      expect(r.status).toBe(200);
      expect(r.body.totals).toMatchObject({ rows: 1, created: 1 });
      expect('token' in r.body).toBe(!!key);
      quiet();
      expect(snapshot()).toEqual(before);
    }
  });

  it('오류(남의 공간 403·없는 파일 404·형식 400·파일 오류 400 file_invalid·처음 회원 403): 같은 조용함, 0쓰기, 공개 칸은 진입점을 지나도 그대로', async () => {
    const bad = store(kim, '﻿제목,날짜\r\n"닫히지 않음,2026-03-01\r\n');
    const cases: [typeof kim, unknown, number][] = [
      [kim, body('x', { spaceId: spaces.get(lee.id) }), 403],
      [kim, body('https://x.test/files/00000000-0000-4000-8000-000000000000/a.csv'), 404],
      [kim, body('x', { wallClock: 'no' }), 400],
      [kim, body(bad.url), 400],
      [fresh, body('x'), 403],
    ];
    for (const [who, payload, status] of cases) {
      h.session = { id: who.id, email: who.email };
      h.pre = { aiKeys: 0, warm: 0, jobs: 0, after: 0, afterRpc: 0, admin: 0, fetch: 0 };
      const before = snapshot();
      const r = await call('previewLectureImport', payload);
      expect(r.status, JSON.stringify(payload).slice(0, 80)).toBe(status);
      quiet();
      expect(snapshot()).toEqual(before);
    }
    h.session = { id: kim.id, email: kim.email };
    const r = await call('previewLectureImport', body(bad.url));
    expect(r.body).toMatchObject({ code: 'file_invalid', detail: { reason: 'unterminated_quote', line: 2 } });
    expect(db.withRequestCache(() => db.getRecord('lit_user', fresh.id))).toBeUndefined();
  });

  it('로그인 없음은 진입점의 401 그대로(명령까지 가지 않음)', async () => {
    h.session = null;
    const before = snapshot();
    const r = await call('previewLectureImport', body('x'));
    expect(r.status).toBe(401);
    quiet();
    expect(snapshot()).toEqual(before);
  });

  it('다른 명령은 예전처럼 AI 키 조회·모델 목록 예열·정시 작업 추적·afterRpc를 한다', async () => {
    const r = await call('loadAccountData', {});
    expect(r.status).toBe(200);
    expect(h.pre.aiKeys).toBe(1);
    expect(h.pre.warm).toBe(1);
    expect(h.pre.jobs).toBe(1);
    expect(h.pre.after).toBe(1);
  });
});
