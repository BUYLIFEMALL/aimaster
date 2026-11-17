// WS-20261117-21 2B — 예약 링크 OFF 배선(Master msg_ad30304f069f, PLAN 7-9). 격리 시험 DB(aww-pg-test)만.
// 실제 처리기를 부른다: runtime.runRpc(회원 처리기 등록), /api/public/[name] POST(공개 입구), /book/[...path] page(공개 페이지).
// 구글은 setGcalFetch로 세기만(OFF에서 0), 토큰·이용 기간·받은 업무는 모의 — 운영 DB·실제 구글 0.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const h = vi.hoisted(() => ({ createClient: vi.fn(async () => ({})) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }));
// QA026: 공개 페이지가 형식에 맞는 토큰일 때만 bookingSlots를 부르는지 세기(실제 함수 그대로 통과)
vi.mock('@/server/booking', async (orig) => {
  const m = await orig<typeof import('../../src/server/booking')>();
  return { ...m, bookingSlots: vi.fn(m.bookingSlots) };
});

let runtime: typeof import('../../src/server/runtime');
let route: typeof import('../../src/app/api/public/[name]/route');
let page: typeof import('../../src/app/book/[...path]/page');
let portalPage: typeof import('../../src/app/portal/[...path]/page');
let bk: typeof import('../../src/server/booking');
let gcal: typeof import('../../src/server/googleCalendar');
let dbm: typeof import('../../src/litpage/server/db.ts');
let NextRequest: typeof import('next/server').NextRequest;

const member = { id: 'c1111111-1111-4111-8111-111111111111', email: 'wire-owner@example.com', name: '배선주인' };
const gcalCalls: string[] = [];
const tableExists = (t: string) => !!(dbm.db.prepare('SELECT to_regclass(?) AS t').get(t) as { t: string | null }).t;
const bookingJobs = () => (dbm.db.prepare("SELECT COUNT(*)::int AS n FROM scheduled_jobs WHERE key LIKE 'booking:%'").get() as { n: number }).n;
let ipN = 0;
function post(name: string, body: unknown, opts: { type?: string; site?: string; raw?: string; ip?: string; query?: string } = {}) {
  const headers: Record<string, string> = { 'content-type': opts.type ?? 'application/json', 'x-forwarded-for': opts.ip ?? `198.18.0.${(ipN++ % 250) + 1}` };
  if (opts.site) headers['sec-fetch-site'] = opts.site;
  const req = new NextRequest(`http://localhost/api/public/${name}${opts.query ?? ''}`, { method: 'POST', headers, body: opts.raw ?? JSON.stringify(body) });
  return route.POST(req, { params: Promise.resolve({ name }) });
}
const noStoreNoIndex = (res: Response) => {
  expect(res.headers.get('X-Robots-Tag')).toBe('noindex');
  expect(res.headers.get('Cache-Control')).toBe('private, no-store');
};
const NAMES = ['bookingGet', 'bookingSave', 'bookingOff', 'bookingList', 'bookingResolve'];

beforeAll(async () => {
  ({ NextRequest } = await import('next/server'));
  dbm = await import('../../src/litpage/server/db.ts');
  gcal = await import('../../src/server/googleCalendar');
  gcal.setGcalFetch((async (u: RequestInfo | URL) => {
    gcalCalls.push(String(u));
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch);
  runtime = await import('../../src/server/runtime');
  route = await import('../../src/app/api/public/[name]/route');
  page = await import('../../src/app/book/[...path]/page');
  portalPage = await import('../../src/app/portal/[...path]/page');
  bk = await import('../../src/server/booking');
});
afterAll(() => {
  gcal.setGcalFetch(undefined);
  bk.setBookingDepsForTests(null);
  bk.setBookingEnabledForTests(false);
});

describe('스위치 OFF(기본) 배선', () => {
  it('회원 처리기·공개 입구·공개 페이지를 불러와도 예약 표 0·예약 작업 0·구글 0', () => {
    expect(tableExists('aww_booking_pages')).toBe(false);
    expect(tableExists('aww_bookings')).toBe(false);
    expect(bookingJobs()).toBe(0);
    expect(gcalCalls).toHaveLength(0);
  });

  it('회원 처리기 5개는 runtime에 등록돼 있고 OFF면 404', async () => {
    for (const n of NAMES) {
      const r = await runtime.runRpc(n, n === 'bookingResolve' ? { id: 'x', choice: 'present' } : {}, member);
      expect(r.status, n).toBe(404);
    }
    const unknown = await runtime.runRpc('bookingNoSuch', {}, member);
    expect(unknown.status).not.toBe(200);
    expect(tableExists('aww_bookings')).toBe(false);
  });

  it('공개 입구 두 명령은 OFF면 404·noindex·no-store, 그 뒤에도 표 0·구글 0', async () => {
    for (const n of ['getBookingSlots', 'submitBooking']) {
      const res = await post(n, { token: 't'.repeat(43), start: Date.now() + 86_400_000, name: '손님', contact: '010' });
      expect(res.status, n).toBe(404);
      noStoreNoIndex(res);
    }
    expect(tableExists('aww_booking_pages')).toBe(false);
    expect(gcalCalls).toHaveLength(0);
  });

  it('공개 입구 형식 검사는 처리기 전에: JSON 아님 415·다른 사이트 403·10KB 초과 413(모두 noindex·no-store)', async () => {
    const a = await post('submitBooking', null, { type: 'text/plain', raw: 'x' });
    expect(a.status).toBe(415);
    const b = await post('submitBooking', { token: 'x' }, { site: 'cross-site' });
    expect(b.status).toBe(403);
    const c = await post('submitBooking', null, { raw: JSON.stringify({ token: 'x', memo: 'm'.repeat(11_000) }) });
    expect(c.status).toBe(413);
    for (const r of [a, b, c]) noStoreNoIndex(r);
    expect(tableExists('aww_bookings')).toBe(false);
  });

  it('공개 입구 IP당 분당 120 한도가 예약 명령에도 걸림(121번째 429)', async () => {
    const one = '198.19.7.7';
    for (let i = 0; i < 120; i++) expect((await post('getBookingSlots', { token: 't'.repeat(43) }, { ip: one })).status).toBe(404);
    const r = await post('getBookingSlots', { token: 't'.repeat(43) }, { ip: one });
    expect(r.status).toBe(429);
    noStoreNoIndex(r);
  });

  it('공개 페이지: OFF면 notFound(404), 포털 페이지와 같은 캐시·색인·참조 설정', async () => {
    await expect(page.default({ params: Promise.resolve({ path: ['t'.repeat(43)] }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    await expect(page.default({ params: Promise.resolve({ path: [] }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    expect(page.metadata.robots).toEqual(portalPage.metadata.robots);
    expect(page.metadata.referrer).toBe('no-referrer');
    expect(page.metadata.referrer).toBe(portalPage.metadata.referrer);
    expect([page.dynamic, page.fetchCache, page.revalidate]).toEqual([portalPage.dynamic, portalPage.fetchCache, portalPage.revalidate]);
    // 기존 포털도 OFF 그대로 404(회귀)
    await expect(portalPage.default({ params: Promise.resolve({ path: ['p'.repeat(43)] }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    expect(tableExists('aww_bookings')).toBe(false);
    expect(gcalCalls).toHaveLength(0);
  });
});

describe('시험에서만 켰을 때 — 배선이 실제로 이어지는지(격리 DB·구글 모의)', () => {
  let token = '';
  beforeAll(() => {
    bk.setBookingEnabledForTests(true);
    bk.setBookingDepsForTests({ ownerCheck: async () => true, token: async () => 'tok', inbox: async () => {}, sleep: async () => {} });
  });
  afterAll(() => {
    bk.setBookingEnabledForTests(false);
  });

  it('회원 처리기는 runtime으로 이어짐(bookingSave → 주소 토큰)', async () => {
    const r = await runtime.runRpc('bookingSave', { settings: { days: [0, 1, 2, 3, 4, 5, 6] } }, member);
    expect(r.status).toBe(200);
    token = (r.body as { token: string }).token;
    expect(token).toHaveLength(43);
  });

  it('공개 입구로 빈 칸 보기·예약 — 토큰은 JSON 본문으로만(쿼리에만 있으면 404), 기록에 토큰·손님 입력 0, 쿠키 세션 미사용', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
    h.createClient.mockClear();
    const slots = await post('getBookingSlots', { token });
    expect(slots.status).toBe(200);
    const view = (await slots.json()) as { slots: { start: number }[] };
    expect(view.slots.length).toBeGreaterThan(0);
    const onlyQuery = await post('submitBooking', { start: view.slots[0].start, name: '배선손님', contact: '010-9999-0000' }, { query: `?token=${token}` });
    expect(onlyQuery.status).toBe(404);
    const ok = await post('submitBooking', { token, start: view.slots[0].start, name: '배선손님', contact: '010-9999-0000', memo: '배선메모' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, status: 'confirmed' });
    noStoreNoIndex(ok);
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(token);
    expect(logged).not.toMatch(/배선손님|010-9999-0000|배선메모/);
    expect(h.createClient).not.toHaveBeenCalled();
    const stored = JSON.stringify(dbm.db.prepare('SELECT * FROM aww_booking_pages').all());
    expect(stored).not.toContain(token);
    spies.forEach((s) => s.mockRestore());
  });

  it('공개 페이지는 켜져 있으면 예약 화면을 그림(토큰은 서버가 판정)', async () => {
    const el = (await page.default({ params: Promise.resolve({ path: [token] }) })) as { props: { children: { props: { token: string; view: { slots: unknown[] } } } } };
    expect(el.props.children.props.token).toBe(token);
    expect(el.props.children.props.view.slots.length).toBeGreaterThan(0);
  });

  it('다시 끄면 같은 토큰도 모든 입구 404', async () => {
    bk.setBookingEnabledForTests(false);
    expect((await post('getBookingSlots', { token })).status).toBe(404);
    expect((await runtime.runRpc('bookingList', {}, member)).status).toBe(404);
    await expect(page.default({ params: Promise.resolve({ path: [token] }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });
});

// ---------------------------------------------------------------- QA026(Mac msg_a17d9b6840fb): 공개 페이지 경로 토큰 — 다시 풀기(decode) 없이 발급 형식만
describe('QA026: 공개 페이지 경로 토큰 검사', () => {
  const VALID = 'aZ09_-'.repeat(7) + 'Q'; // 43자 base64url(발급 형식)
  const slotsSpy = () => bk.bookingSlots as unknown as { mock: { calls: unknown[][] }; mockClear: () => void };
  const nf = (path: string[]) => expect(page.default({ params: Promise.resolve({ path }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });

  it.each([
    ['빈 경로', []],
    ['여러 칸', ['a'.repeat(43), 'b']],
    ['% 하나', ['%']],
    ['잘못된 퍼센트', ['%E0%A4%A']],
    ['%25 경계', ['%25']],
    ['토큰 뒤 %', ['t'.repeat(43) + '%']],
    ['유니코드', ['한글토큰'.repeat(9)]],
    ['너무 짧음', ['abc']],
    ['너무 김', ['t'.repeat(44)]],
    ['아주 김', ['t'.repeat(5000)]],
    ['허용 밖 문자', ['t'.repeat(42) + '.']],
  ])('%s → 예외 없이 404, bookingSlots 호출 0', async (_n, path) => {
    slotsSpy().mockClear();
    await nf(path as string[]);
    expect(slotsSpy().mock.calls).toHaveLength(0);
  });

  it('발급 형식 토큰은 그대로(다시 풀지 않고) bookingSlots에 한 번 넘기고, OFF라 404', async () => {
    slotsSpy().mockClear();
    const g0 = gcalCalls.length;
    const rows = () => (dbm.db.prepare('SELECT COUNT(*)::int AS n FROM aww_bookings').get() as { n: number }).n;
    const r0 = rows(); // 앞의 「시험에서만 켰을 때」가 표를 만들었으므로 「늘지 않음」으로 확인
    await nf([VALID]);
    expect(slotsSpy().mock.calls).toHaveLength(1);
    expect(slotsSpy().mock.calls[0][0]).toBe(VALID);
    expect(gcalCalls.length).toBe(g0);
    expect(rows()).toBe(r0);
  });
});
