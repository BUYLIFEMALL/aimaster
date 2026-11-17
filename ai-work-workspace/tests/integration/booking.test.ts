// PLAN-20261117-01 E2 7-2 예약 링크 서버 1단계(WS-20261117-21) — 로컬 Docker Postgres(aww-pg-test, 격리 시험 DB)만.
// 구글은 setGcalFetch 모의, 토큰·이용 기간·받은 업무 보내기는 setBookingDepsForTests 모의 → 운영 DB·실제 구글·메일·카톡 호출 0.
// 1. 스위치 꺼짐: 모든 진입점이 표 생성·예약 표 접속·구글 호출 전에 끝
// 2. 순수 계산: 시간대(서머타임 없는/두 번 있는 시각)·준비 시간 양쪽·맞닿음·종일·하루 최대·21일·결과 분류·고정 id
// 3. 켠 뒤: 칸 잡기 잠금(다른 연결이 잡은 잠금을 기다림)·구글 재확인·응답 코드별 상태·확인 작업(GET만, 재POST 0)·회원 범위·보관
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

const MIN = 60_000;
const DAY = 86_400_000;
let bk: typeof import('../../src/server/booking');
let gcal: typeof import('../../src/server/googleCalendar');
let dbm: typeof import('../../src/litpage/server/db.ts');
let sched: typeof import('../../src/litpage/server/scheduler.ts');
let jobs: typeof import('../../src/server/memberJobs');

const owner = 'b1111111-1111-4111-8111-111111111111';
const other = 'b2222222-2222-4222-8222-222222222222';
const ctx = (userId: string | null) => ({ userId, setCookie() {} }) as never;

// ---- 모의 구글
type PostStep = number | { status: number; reason?: string; store?: (b: any) => any } | 'throw';
const calls: { method: string; url: string; body: any }[] = [];
let postQueue: PostStep[] = [];
let busyItems: any[] = [];
let listFail = 0;
const events = new Map<string, any>();
let getGate: Promise<void> | null = null;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
async function fakeFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const u = String(url);
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  calls.push({ method, url: u, body });
  if (method === 'POST') {
    const step = postQueue.length ? postQueue.shift()! : 200;
    if (step === 'throw') throw new Error('network down');
    const st = typeof step === 'number' ? step : step.status;
    if (typeof step === 'object' && step.store) events.set(body.id, step.store(body));
    if (st === 200) {
      events.set(body.id, body);
      return json({ ...body });
    }
    return json({ error: { errors: [{ reason: typeof step === 'object' ? step.reason ?? '' : '' }] } }, st);
  }
  if (u.includes('/events?')) return listFail ? json({}, listFail) : json({ items: busyItems });
  if (getGate) await getGate; // QA024: 확인 GET을 붙잡아 두는 시험용
  const id = decodeURIComponent(u.split('/events/')[1] ?? '');
  const e = events.get(id);
  return e ? json(e) : json({ error: { errors: [{ reason: 'notFound' }] } }, 404);
}
const posts = () => calls.filter((c) => c.method === 'POST');
const gets = () => calls.filter((c) => c.method === 'GET' && c.url.includes('/events/'));

// ---- 모의 토큰·이용 기간·받은 업무
let ownerOk = true;
let tokenFail: 'auth' | 'other' | null = null;
let forceFail = false;
const tokenCalls: (undefined | { force?: boolean })[] = [];
const inbox: any[] = [];
let sleeps = 0;

const tableExists = (t: string) => !!(dbm.db.prepare('SELECT to_regclass(?) AS t').get(t) as { t: string | null }).t;
let ipN = 0;
const ip = () => `198.51.100.${(ipN++ % 250) + 1}`;

/** 내일 모레부터 n번째 평일(한국 시간) hh:mm → UTC ms */
function kst(n: number, hh: number, mm = 0): number {
  let t = Date.now() + 2 * DAY;
  let k = 0;
  for (;;) {
    const p = new Date(t + 9 * 3600_000);
    const wd = p.getUTCDay();
    if (wd >= 1 && wd <= 5) {
      if (k === n) return Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate(), hh - 9, mm);
      k++;
    }
    t += DAY;
  }
}
let slotN = 0;
/** 서로 겹치지 않는 시각 하나(하루 8칸·하루 최대 10 미만) */
const nextSlot = () => {
  const i = slotN++;
  return kst(Math.floor(i / 8), 10 + (i % 8));
};
let token = '';
const submit = (start: number, extra: Record<string, unknown> = {}, tok = token) => bk.bookingSubmit(tok, ip(), { start, name: '김손님', contact: '010-1234-5678', memo: '상담', ...extra });
const row = (id: string) => dbm.db.prepare('SELECT * FROM aww_bookings WHERE id = ?').get(id) as any;

beforeAll(async () => {
  dbm = await import('../../src/litpage/server/db.ts');
  sched = await import('../../src/litpage/server/scheduler.ts');
  gcal = await import('../../src/server/googleCalendar');
  bk = await import('../../src/server/booking');
  jobs = await import('../../src/server/memberJobs');
  gcal.setGcalFetch(fakeFetch as typeof fetch);
  bk.setBookingDepsForTests({
    ownerCheck: async () => ownerOk,
    token: async (_u, o) => {
      tokenCalls.push(o);
      if (o?.force && forceFail) throw new gcal.GcalError('auth', 'x');
      if (tokenFail === 'auth') throw new gcal.GcalError('auth', 'x');
      if (tokenFail === 'other') throw new Error('supabase down');
      return 'tok';
    },
    inbox: async (item) => {
      inbox.push(item);
    },
    sleep: async () => {
      sleeps++;
    },
  });
});
afterAll(() => {
  gcal.setGcalFetch(undefined);
  bk.setBookingDepsForTests(null);
  bk.setBookingEnabledForTests(false);
});

describe('1. 스위치 꺼짐(기본) — 표·예약 표 접속·구글 0', () => {
  it('모듈을 불러와도 표가 없고, 모든 진입점이 아무것도 하지 않음', async () => {
    expect(tableExists('aww_booking_pages')).toBe(false);
    expect(tableExists('aww_bookings')).toBe(false);
    expect(await bk.bookingSlots('x'.repeat(43), ip())).toBeNull();
    expect(await bk.bookingSubmit('x'.repeat(43), ip(), { start: kst(0, 10) })).toBeNull();
    await bk.reconcileBooking({ bookingId: 'any', step: 1 });
    expect(bk.runBookingRetention()).toEqual({ skipped: 'off' });
    for (const h of [() => bk.bookingHandlers.bookingGet(ctx(owner)), () => bk.bookingHandlers.bookingSave(ctx(owner), {}), () => bk.bookingHandlers.bookingOff(ctx(owner)), () => bk.bookingHandlers.bookingResolve(ctx(owner), { id: 'x', choice: 'present' })]) {
      expect(h).toThrow(/Not found/);
    }
    await expect(bk.bookingHandlers.bookingList(ctx(owner))).rejects.toThrow(/Not found/);
    expect(tableExists('aww_booking_pages')).toBe(false);
    expect(tableExists('aww_bookings')).toBe(false);
    expect(calls).toHaveLength(0);
    expect(tokenCalls).toHaveLength(0);
    expect(inbox).toHaveLength(0);
    expect(sched.listJobs('booking:')).toHaveLength(0);
  });
});

describe('2. 순수 계산', () => {
  const base = () => ({ ...bk.DEFAULT_SETTINGS, days: [0, 1, 2, 3, 4, 5, 6], startMin: 600, endMin: 780 });
  // 2026-12-01(화) 한국 시간 기준
  const at = (h: number, m = 0) => Date.UTC(2026, 11, 1, h - 9, m);
  const now = Date.UTC(2026, 10, 30, 0, 0);

  it('한국 시간 벽시계 → UTC, 서머타임 없는 시각·두 번 있는 시각은 칸을 만들지 않음', () => {
    expect(bk.wallToUtc(2026, 12, 1, 600, 'Asia/Seoul')).toBe(at(10));
    expect(bk.wallToUtc(2027, 3, 14, 150, 'America/New_York')).toBeNull(); // 02:30 없음
    expect(bk.wallToUtc(2026, 11, 1, 90, 'America/New_York')).toBeNull(); // 01:30 두 번
    expect(bk.wallToUtc(2026, 11, 1, 180, 'America/New_York')).toBe(Date.UTC(2026, 10, 1, 8, 0)); // 03:00 EST
  });

  it('맞닿음은 허용, 준비 시간은 후보 앞뒤 양쪽에 적용', () => {
    const busy: [number, number][] = [[at(11), at(12)]];
    const starts = (s: any) => bk.computeSlots(s, busy, [], now).filter((x) => x.start >= at(10) && x.start < at(13)).map((x) => (x.start - at(0)) / MIN / 60);
    expect(starts(base())).toEqual([10, 10.5, 12, 12.5]);
    expect(starts({ ...base(), beforeMin: 15 })).toEqual([10, 10.5, 12.5]); // 12:00은 11:45부터라 겹침
    expect(starts({ ...base(), afterMin: 15 })).toEqual([10, 12, 12.5]); // 10:30은 11:15까지라 겹침
  });

  it('종일 일정은 회원 시간대의 그 날 전체를 막음, 취소·한가함은 목록 단계에서 빠짐', () => {
    const busy = bk.busyRanges([{ startDate: '2026-12-01', endDate: '2026-12-02' }], 'Asia/Seoul');
    expect(busy).toEqual([[at(0), at(24)]]);
    expect(bk.computeSlots(base(), busy, [], now).filter((x) => x.start >= at(0) && x.start < at(24))).toHaveLength(0);
  });

  it('하루 최대 수에 닿으면 그날 칸 없음, 우리 예약도 바쁜 구간', () => {
    const s = { ...base(), maxPerDay: 2 };
    const H = (a: number, b: number, beforeMin = 0, afterMin = 0) => ({ start: a, end: b, beforeMin, afterMin });
    const hold = [H(at(10), at(10, 30))];
    const day = (h: ReturnType<typeof H>[], ss = s) => bk.computeSlots(ss, [], h, now).filter((x) => x.start >= at(0) && x.start < at(24)).map((x) => x.start);
    expect(day(hold)).not.toContain(at(10));
    expect(day([...hold, H(at(12), at(12, 30))])).toHaveLength(0);
    // QA024 P1-2 순수: 기존 예약의 뒤 준비 30분 → 10:30 후보 막힘, 11:00은 맞닿음이라 열림(설정 준비 시간 0이어도 스냅샷 기준)
    const wide = { ...s, maxPerDay: 10 };
    expect(day([H(at(10), at(10, 30), 0, 30)], wide)).not.toContain(at(10, 30));
    expect(day([H(at(10), at(10, 30), 0, 30)], wide)).toContain(at(11));
    // 역순: 설정 앞 준비 30분이면 기존 11:00 예약 앞의 10:30 후보는 막힘(새 후보 쪽 준비 시간)
    expect(day([H(at(11), at(11, 30))], { ...wide, afterMin: 30 })).not.toContain(at(10, 30));
    expect(bk.occupied(H(at(10), at(10, 30), 15, 30))).toEqual([at(9, 45), at(11)]);
  });

  it('예약 기간은 21일까지(설정에서 더 길게 넣어도 21), 지난 시각 제외', () => {
    expect(bk.cleanSettings({ horizonDays: 60 }).horizonDays).toBe(21);
    const s = { ...base(), horizonDays: 21 };
    const slots = bk.computeSlots(s, [], [], now);
    expect(Math.max(...slots.map((x) => x.start))).toBeLessThanOrEqual(now + 21 * DAY);
    expect(Math.min(...slots.map((x) => x.start))).toBeGreaterThan(now);
    expect(() => bk.cleanSettings({ days: [] })).toThrow(/요일/);
    expect(() => bk.cleanSettings({ startMin: 600, endMin: 610, slotMin: 30 })).toThrow(/끝 시각/);
  });

  it('구글 응답 분류(공식 오류 안내 기준)와 고정 일정 id 형식', () => {
    const c = (status: number, reason = '') => bk.classifyInsert({ status, reason, body: {} });
    expect([c(200), c(409), c(401), c(429), c(403, 'rateLimitExceeded'), c(403, 'userRateLimitExceeded')]).toEqual(['confirmed', 'verify', 'auth', 'retry_rate', 'retry_rate', 'retry_rate']);
    expect([c(0), c(408), c(500), c(502), c(503)]).toEqual(['unknown', 'unknown', 'unknown', 'unknown', 'unknown']);
    expect([c(400), c(403, 'quotaExceeded'), c(403, 'forbidden'), c(404)]).toEqual(['fail', 'fail', 'fail', 'fail']);
    const id = bk.gcalIdOf('3f2b8c1e-9a7d-4e6f-8b0a-1c2d3e4f5a6b');
    expect(id).toMatch(/^[a-v0-9]{5,1024}$/);
    expect(id).toBe('bk3f2b8c1e9a7d4e6f8b0a1c2d3e4f5a6b');
  });
});

describe('3. 켠 뒤(격리 시험 DB)', () => {
  beforeAll(() => {
    bk.setBookingEnabledForTests(true);
  });
  beforeEach(() => {
    postQueue = [];
    busyItems = [];
    listFail = 0;
    ownerOk = true;
    tokenFail = null;
    forceFail = false;
  });

  it('주소 만들기: 처음·다시 켤 때·rotate만 새 토큰, DB에는 해시만, 끄면 닫힘', async () => {
    const first = bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} });
    expect(first.token).toBeTruthy();
    token = first.token!;
    expect(tableExists('aww_booking_pages')).toBe(true);
    expect(bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} }).token).toBeNull();
    const raw = JSON.stringify(dbm.db.prepare('SELECT * FROM aww_booking_pages').all());
    expect(raw).not.toContain(token);
    const rot = bk.bookingHandlers.bookingSave(ctx(owner), { settings: {}, rotate: true }).token!;
    expect(await bk.bookingSlots(token, ip())).toBeNull(); // 옛 주소 닫힘
    token = rot;
    expect((await bk.bookingSlots(token, ip()))!.slots.length).toBeGreaterThan(0);
    bk.bookingHandlers.bookingOff(ctx(owner));
    expect(await bk.bookingSlots(token, ip())).toBeNull();
    token = bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} }).token!; // 다시 켜면 새 주소
    expect(token).not.toBe(rot);
    expect(() => bk.bookingHandlers.bookingGet(ctx(null))).toThrow(/Unauthorized/);
  });

  it('만든 회원 이용 기간이 끝났거나 구글 연결이 끊기면 주소 닫힘', async () => {
    ownerOk = false;
    expect(await bk.bookingSlots(token, ip())).toBeNull();
    expect(await submit(nextSlot())).toBeNull();
    ownerOk = true;
    tokenFail = 'auth';
    expect(await bk.bookingSlots(token, ip())).toBeNull();
  });

  it('구글 목록을 못 읽으면 빈 칸이라고 단정하지 않음', async () => {
    listFail = 503;
    const v = await bk.bookingSlots(token, '203.0.113.200', Date.now() + 2 * MIN); // 60초 목록 보관을 피함
    expect(v).toMatchObject({ unavailable: true, slots: [] });
  });

  it('확정: 같은 고정 id로 POST, 구글에는 이름만, 받은 업무에는 손님 정보 없음', async () => {
    const start = nextSlot();
    const before = posts().length;
    const r = await submit(start);
    expect(r).toMatchObject({ ok: true, status: 'confirmed' });
    const id = (r as any).bookingId;
    expect(row(id).status).toBe('confirmed');
    const p = posts().at(-1)!.body;
    expect(posts().length - before).toBe(1);
    expect(p.id).toBe(bk.gcalIdOf(id));
    expect(p.extendedProperties.private.awwBookingId).toBe(id);
    expect(JSON.stringify(p)).toContain('김손님');
    expect(JSON.stringify(p)).not.toContain('010-1234-5678');
    expect(JSON.stringify(p)).not.toContain('상담');
    const n = inbox.at(-1);
    expect(n.title).toContain('새 예약 확정');
    expect(JSON.stringify(n)).not.toMatch(/김손님|010-1234-5678|상담/);
    // 같은 칸 두 번째 → 막힘, POST 없음
    const again = await submit(start);
    expect(again).toMatchObject({ ok: false });
    expect(posts().length - before).toBe(1);
  });

  it('두 연결 동시: 다른 연결이 설정 행을 잠근 채 같은 칸을 넣으면, 이쪽은 잠금을 기다린 뒤 그 예약을 보고 거절', async () => {
    const start = nextSlot();
    const sql = postgres(process.env.AWW_DATABASE_URL!, { max: 1, onnotice: () => {} });
    try {
      const otherId = crypto.randomUUID();
      const t = Date.now();
      const lockAndInsert = sql.unsafe(`DO $$ BEGIN
        PERFORM 1 FROM aww_booking_pages WHERE user_id = '${owner}' FOR UPDATE;
        PERFORM pg_sleep(1.5);
        INSERT INTO aww_bookings (id, user_id, start_ms, end_ms, status, gcal_id, final_unknown, created_time, updated_time)
          VALUES ('${otherId}', '${owner}', ${start}, ${start + 30 * MIN}, 'pending', 'bkother', 0, ${t}, ${t});
      END $$`).execute(); // postgres.js는 await·execute 전에는 보내지 않음
      await new Promise((r) => setTimeout(r, 600)); // 다른 연결이 잠금을 먼저 잡게
      const postsBefore = posts().length;
      const t0 = Date.now();
      const r = await submit(start);
      const waited = Date.now() - t0;
      await lockAndInsert;
      expect(waited).toBeGreaterThan(900); // 잠금을 실제로 기다림
      expect(r).toMatchObject({ ok: false });
      expect((r as any).error).toMatch(/방금 다른 예약/);
      expect(posts().length).toBe(postsBefore);
      const mine = dbm.db.prepare('SELECT COUNT(*)::int AS n FROM aww_bookings WHERE user_id = ? AND start_ms = ?').get(owner, start) as { n: number };
      expect(mine.n).toBe(1); // 다른 연결 것 하나만
    } finally {
      await sql.end();
    }
  });

  it('하루 최대·설정에 없는 시각·지난 시각·21일 넘김·입력 길이', async () => {
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: { maxPerDay: 1, horizonDays: 21 } });
    const d = kst(9, 10);
    expect(await submit(d)).toMatchObject({ ok: true });
    expect(await submit(d + 2 * 3600_000)).toMatchObject({ ok: false, error: expect.stringMatching(/모두 찼/) });
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} });
    expect(await submit(kst(1, 10, 15))).toMatchObject({ ok: false, error: expect.stringMatching(/예약할 수 없/) });
    expect(await submit(Date.now() - DAY)).toMatchObject({ ok: false });
    expect(await submit(Date.now() + 30 * DAY)).toMatchObject({ ok: false });
    expect(await submit(nextSlot(), { name: 'x'.repeat(51) })).toMatchObject({ ok: false, error: expect.stringMatching(/이름/) });
    expect(await submit(nextSlot(), { memo: 'x'.repeat(501) })).toMatchObject({ ok: false, error: expect.stringMatching(/메모/) });
  });

  it('구글 재확인에서 회원 일정과 겹치면 POST 없이 칸 해제', async () => {
    const start = nextSlot();
    busyItems = [{ start: { dateTime: new Date(start + 10 * MIN).toISOString() }, end: { dateTime: new Date(start + 40 * MIN).toISOString() } }];
    const before = posts().length;
    const r = await submit(start);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/회원 일정/) });
    expect(posts().length).toBe(before);
    busyItems = [];
    expect(await submit(start)).toMatchObject({ ok: true }); // 칸이 다시 열림
  });

  it('토큰을 못 받으면(Supabase 오류) 실패·칸 해제, 아무것도 보내지 않음', async () => {
    tokenFail = 'other';
    const start = nextSlot();
    const before = calls.length;
    expect(await submit(start)).toMatchObject({ ok: false });
    expect(calls.length).toBe(before);
    tokenFail = null;
    expect(await submit(start)).toMatchObject({ ok: true });
  });

  const flow = async (queue: PostStep[]) => {
    postQueue = [...queue];
    const start = nextSlot();
    const before = posts().length;
    const inboxBefore = inbox.length;
    const r = (await submit(start)) as any;
    const id = r?.bookingId ?? (dbm.db.prepare('SELECT id FROM aww_bookings WHERE start_ms = ? ORDER BY created_time DESC LIMIT 1').get(start) as any)?.id;
    return { r, id, start, posted: posts().slice(before), notices: inbox.slice(inboxBefore) };
  };

  it('400·quotaExceeded·그 밖 403·404 → 실패, 재시도 0, 칸 해제, 회원 알림', async () => {
    for (const step of [400, { status: 403, reason: 'quotaExceeded' }, { status: 403, reason: 'forbidden' }, 404] as PostStep[]) {
      const f = await flow([step]);
      expect(f.r).toMatchObject({ ok: false });
      expect(f.posted).toHaveLength(1);
      expect(row(f.id).status).toBe('failed');
      expect(f.notices.map((n) => n.title)).toEqual([expect.stringMatching(/받지 못함/)]);
      expect(await submit(f.start)).toMatchObject({ ok: true }); // 칸 다시 열림
    }
  });

  it('401 → 토큰 한 번 새로 받아 같은 id로 1회 재시도', async () => {
    const f = await flow([401, 200]);
    expect(f.r).toMatchObject({ ok: true, status: 'confirmed' });
    expect(f.posted.map((p) => p.body.id)).toEqual([bk.gcalIdOf(f.id), bk.gcalIdOf(f.id)]);
    expect(tokenCalls.at(-1)).toEqual({ force: true });
    const g = await flow([401, 401]);
    expect(row(g.id).status).toBe('failed');
    expect(g.notices[0].bodyMd).toMatch(/다시 연결/);
    forceFail = true;
    const h = await flow([401]);
    expect(row(h.id)).toMatchObject({ status: 'failed', fail_reason: 'auth' });
    expect(h.posted).toHaveLength(1);
  });

  it('429·rateLimitExceeded → 같은 id로 대기 후 재시도(최대 3), 끝까지 거절이면 실패', async () => {
    const s0 = sleeps;
    const f = await flow([429, { status: 403, reason: 'userRateLimitExceeded' }, 200]);
    expect(row(f.id).status).toBe('confirmed');
    expect(new Set(f.posted.map((p) => p.body.id))).toEqual(new Set([bk.gcalIdOf(f.id)]));
    expect(sleeps - s0).toBe(2);
    const g = await flow([429, 429, 429, 429]);
    expect(g.posted).toHaveLength(4);
    expect(row(g.id).status).toBe('failed');
  });

  it('409: 그 id GET이 4조건 일치일 때만 확정, 다른 일정·취소면 확인 필요(재생성 0)', async () => {
    const ok = await flow([{ status: 409, store: (b) => b }]);
    expect(row(ok.id).status).toBe('confirmed');
    const other1 = await flow([{ status: 409, store: (b) => ({ ...b, extendedProperties: { private: { awwBookingId: 'someone-else' } } }) }]);
    expect(row(other1.id)).toMatchObject({ status: 'needs_check', final_unknown: 1 });
    expect(other1.posted).toHaveLength(1);
    expect(other1.notices[0].title).toMatch(/확인 필요/);
    expect(await submit(other1.start)).toMatchObject({ ok: false }); // 칸 유지
    const shifted = await flow([{ status: 409, store: (b) => ({ ...b, start: { dateTime: new Date(Date.parse(b.start.dateTime) + MIN).toISOString() } }) }]);
    expect(row(shifted.id).status).toBe('needs_check');
    const cancelled = await flow([{ status: 409, store: (b) => ({ ...b, status: 'cancelled' }) }]);
    expect(row(cancelled.id)).toMatchObject({ status: 'needs_check', final_unknown: 1 });
  });

  it('생겼는지 모름(503·연결 끊김·408) → 확인 필요·칸 유지·회원 작업으로 확인 예약, 손님에게는 「접수됨」', async () => {
    for (const step of [503, 'throw', 408] as PostStep[]) {
      const f = await flow([step]);
      expect(f.r).toMatchObject({ ok: true, status: 'received' });
      expect(row(f.id)).toMatchObject({ status: 'needs_check', final_unknown: 0 });
      const job = sched.getJob(`booking:${f.id}`)!;
      expect(job.kind).toBe('booking.reconcile');
      expect(job.payload).toMatchObject({ ownerId: owner, bookingId: f.id, step: 1 });
      expect(jobs.jobOwner(job)).toBe(owner);
      expect(jobs.memberJobFilter(owner)(job)).toBe(true);
      expect(jobs.memberJobFilter(other)(job)).toBe(false);
      expect(jobs.operatorJobFilter(job)).toBe(false);
      expect(await submit(f.start)).toMatchObject({ ok: false });
    }
  });

  it('확인 작업: GET 404가 세 번이어도 칸을 풀거나 다시 POST하지 않고, 마지막에 회원에게 확인 요청', async () => {
    const f = await flow([503]);
    const postN = posts().length;
    const gets0 = gets().length;
    for (const step of [1, 2]) {
      await bk.reconcileBooking({ bookingId: f.id, step });
      expect(row(f.id)).toMatchObject({ status: 'needs_check', final_unknown: 0 });
      expect(sched.getJob(`booking:${f.id}`)!.payload).toMatchObject({ step: step + 1 });
    }
    const n0 = inbox.length;
    await bk.reconcileBooking({ bookingId: f.id, step: 3 });
    expect(row(f.id)).toMatchObject({ status: 'needs_check', final_unknown: 1 });
    expect(inbox.slice(n0).map((n) => n.title)).toEqual([expect.stringMatching(/확인 필요/)]);
    expect(gets().length - gets0).toBe(3);
    expect(posts().length).toBe(postN);
    // 회원이 직접 고름: 없음 → 칸 풀기
    bk.bookingHandlers.bookingResolve(ctx(owner), { id: f.id, choice: 'absent' });
    expect(row(f.id).status).toBe('released');
    expect(await submit(f.start)).toMatchObject({ ok: true });
  });

  it('확인 작업: 그 사이 일정이 확인되면 확정, 예약 시각이 지나면 만료', async () => {
    const f = await flow(['throw']);
    // POST가 실제로는 구글에 들어갔던 상황을 흉내: 보낸 본문 그대로 구글에 있음
    events.set(bk.gcalIdOf(f.id), { id: bk.gcalIdOf(f.id), status: 'confirmed', start: { dateTime: new Date(f.start).toISOString() }, end: { dateTime: new Date(f.start + 30 * MIN).toISOString() }, extendedProperties: { private: { awwBookingId: f.id } } });
    await bk.reconcileBooking({ bookingId: f.id, step: 1 });
    expect(row(f.id).status).toBe('confirmed');
    const g = await flow([503]);
    dbm.db.prepare('UPDATE aww_bookings SET start_ms = ?, end_ms = ? WHERE id = ?').run(Date.now() - MIN, Date.now() + 29 * MIN, g.id);
    await bk.reconcileBooking({ bookingId: g.id, step: 1 });
    expect(row(g.id).status).toBe('expired');
  });

  it('두 worker가 같은 확인 작업을 동시에 돌려도 GET 한 번(작업기 claim)', async () => {
    const f = await flow([503]);
    const gets0 = gets().length;
    const later = Date.now() + 2 * MIN;
    const only = (job: any) => jobs.memberJobFilter(owner)(job) && job.key === `booking:${f.id}`;
    await Promise.all([sched.runDueJobs(later, 50, only), sched.runDueJobs(later, 50, only)]);
    expect(gets().length - gets0).toBe(1);
    expect(sched.getJob(`booking:${f.id}`)!.payload).toMatchObject({ step: 2 });
  });

  it('회원 목록: 본인 것만, 처리 중에 끊긴 예약은 확인 필요로, 다른 회원은 남의 예약을 고를 수 없음', async () => {
    const f = await flow([200]);
    const stuckId = crypto.randomUUID();
    const s = nextSlot();
    const old = Date.now() - 10 * MIN;
    dbm.db.prepare(`INSERT INTO aww_bookings (id, user_id, start_ms, end_ms, status, gcal_id, guest_name, guest_contact, final_unknown, created_time, updated_time)
      VALUES (?, ?, ?, ?, 'pending', ?, '끊긴손님', '010', 0, ?, ?)`).run(stuckId, owner, s, s + 30 * MIN, bk.gcalIdOf(stuckId), old, old);
    const list = await bk.bookingHandlers.bookingList(ctx(owner));
    expect(list.some((x) => x.id === f.id && x.name === '김손님')).toBe(true);
    expect(row(stuckId).status).toBe('needs_check');
    expect(sched.getJob(`booking:${stuckId}`)).toBeTruthy();
    expect(await bk.bookingHandlers.bookingList(ctx(other))).toEqual([]);
    expect(() => bk.bookingHandlers.bookingResolve(ctx(other), { id: stuckId, choice: 'present' })).toThrow(/Not found/);
    expect(() => bk.bookingHandlers.bookingResolve(ctx(owner), { id: f.id, choice: 'absent' })).toThrow(/Not found/); // 확인 필요가 아니면 못 바꿈
    bk.bookingHandlers.bookingResolve(ctx(owner), { id: stuckId, choice: 'present' });
    expect(row(stuckId).status).toBe('confirmed');
  });

  it('요청 한도: 화면 열기 IP당 분당 30, 제출 IP당 시간당 5', async () => {
    const one = '192.0.2.77';
    const t = Date.now() + 5 * MIN;
    for (let i = 0; i < 30; i++) expect(await bk.bookingSlots(token, one, t)).not.toBeNull();
    expect(await bk.bookingSlots(token, one, t)).toBeNull();
    const two = '192.0.2.78';
    for (let i = 0; i < 5; i++) await bk.bookingSubmit(token, two, { start: 1 }, t);
    expect(await bk.bookingSubmit(token, two, { start: 1 }, t)).toMatchObject({ ok: false, error: expect.stringMatching(/너무 많/) });
  });

  it('받은 날 30일 정리: 보관 예외 회원은 남김', () => {
    const mk = (user: string) => {
      const id = crypto.randomUUID();
      const old = Date.now() - 31 * DAY;
      dbm.db.prepare(`INSERT INTO aww_bookings (id, user_id, start_ms, end_ms, status, gcal_id, guest_name, guest_contact, final_unknown, created_time, updated_time)
        VALUES (?, ?, 1, 2, 'confirmed', ?, 'x', 'y', 0, ?, ?)`).run(id, user, bk.gcalIdOf(id), old, old);
      return id;
    };
    const a = mk(owner);
    const b = mk(other);
    const recent = posts().length; // 손대지 않음 확인용
    const r = bk.runBookingRetention(Date.now(), new Set([other]));
    expect((r as { bookings: number }).bookings).toBeGreaterThanOrEqual(1);
    expect(row(a)).toBeUndefined();
    expect(row(b)).toBeTruthy();
    expect(posts().length).toBe(recent);
  });

  // ---------------------------------------------------------------- QA024 반례(Mac msg_37002521ac85)
  const gate = () => {
    let open!: () => void;
    getGate = new Promise<void>((r) => (open = r));
    return () => {
      getGate = null;
      open();
    };
  };
  const waitGets = async (n: number) => {
    for (let i = 0; i < 400 && gets().length < n; i++) await new Promise((r) => setTimeout(r, 5));
  };
  const matchEvent = (id: string, start: number) => events.set(bk.gcalIdOf(id), { id: bk.gcalIdOf(id), status: 'confirmed', start: { dateTime: new Date(start).toISOString() }, end: { dateTime: new Date(start + 30 * MIN).toISOString() }, extendedProperties: { private: { awwBookingId: id } } });

  it('QA024 P1-1: 확인 GET을 기다리는 사이 회원이 「없음」을 고르면, 늦은 일치 응답이 덮어쓰지 않음(알림 0)', async () => {
    const f = await flow([503]);
    matchEvent(f.id, f.start);
    const g0 = gets().length;
    const n0 = inbox.length;
    const release = gate();
    const p = bk.reconcileBooking({ bookingId: f.id, step: 1 });
    await waitGets(g0 + 1);
    bk.bookingHandlers.bookingResolve(ctx(owner), { id: f.id, choice: 'absent' });
    release();
    await p;
    expect(row(f.id).status).toBe('released');
    expect(inbox.slice(n0)).toHaveLength(0);
  });

  it('QA024 P1-1: GET을 기다리는 사이 만료되면 만료 유지', async () => {
    const f = await flow([503]);
    matchEvent(f.id, f.start);
    const g0 = gets().length;
    const release = gate();
    const p = bk.reconcileBooking({ bookingId: f.id, step: 1 });
    await waitGets(g0 + 1);
    dbm.db.prepare("UPDATE aww_bookings SET status = 'expired' WHERE id = ?").run(f.id);
    release();
    await p;
    expect(row(f.id).status).toBe('expired');
  });

  it('QA024 P1-1: 두 확인이 동시에 일치를 받아도 확정 알림은 한 번', async () => {
    const f = await flow([503]);
    matchEvent(f.id, f.start);
    const g0 = gets().length;
    const n0 = inbox.length;
    const release = gate();
    const a = bk.reconcileBooking({ bookingId: f.id, step: 1 });
    const b = bk.reconcileBooking({ bookingId: f.id, step: 1 });
    await waitGets(g0 + 2);
    release();
    await Promise.all([a, b]);
    expect(row(f.id).status).toBe('confirmed');
    expect(inbox.slice(n0).filter((x) => /확정/.test(x.title))).toHaveLength(1);
  });

  it('QA024 P1-1: POST 응답을 기다리는 사이 상태가 바뀌면(처리 중에 끊긴 것으로 넘어감) 늦은 성공이 덮어쓰지 않음', async () => {
    const start = nextSlot();
    let open!: () => void;
    const hold = new Promise<void>((r) => (open = r));
    const before = posts().length;
    postQueue = [200];
    const realFetch = fakeFetch;
    let postStarted = false;
    gcal.setGcalFetch((async (u: any, i: any) => {
      if ((i?.method ?? 'GET') === 'POST') {
        postStarted = true;
        await hold;
      }
      return realFetch(u, i);
    }) as typeof fetch);
    const n0 = inbox.length;
    const p = submit(start);
    for (let k = 0; k < 400 && !postStarted; k++) await new Promise((r) => setTimeout(r, 5));
    expect(posts().length).toBe(before); // 아직 구글 응답 전
    const id = (dbm.db.prepare('SELECT id FROM aww_bookings WHERE start_ms = ? ORDER BY created_time DESC LIMIT 1').get(start) as any).id;
    dbm.db.prepare("UPDATE aww_bookings SET status = 'needs_check' WHERE id = ?").run(id); // 목록 정리가 끊긴 것으로 넘긴 상황
    open();
    const r = await p;
    gcal.setGcalFetch(fakeFetch as typeof fetch);
    expect(row(id).status).toBe('needs_check');
    expect(r).toMatchObject({ ok: true, status: 'received' });
    expect(inbox.slice(n0).filter((x) => /확정/.test(x.title))).toHaveLength(0);
  });

  it('QA024 P1-2: 준비 시간은 기존 예약에도 — 순서 무관 대칭, 맞닿음 허용, 설정을 바꿔도 받은 예약의 준비 시간 유지', async () => {
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: { beforeMin: 0, afterMin: 30, horizonDays: 21 } });
    const d = (h: number, m = 0) => kst(12, h, m);
    expect(await submit(d(10))).toMatchObject({ ok: true });
    expect(await submit(d(10, 30))).toMatchObject({ ok: false }); // 기존 10:00 예약의 뒤 준비 30분과 겹침
    expect(await submit(d(14, 30))).toMatchObject({ ok: true });
    expect(await submit(d(14))).toMatchObject({ ok: false }); // 역순도 같게
    expect(await submit(d(11))).toMatchObject({ ok: true }); // 10:00~11:00 점유와 맞닿음은 허용
    expect(await submit(d(16))).toMatchObject({ ok: true });
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: { beforeMin: 0, afterMin: 0, horizonDays: 21 } });
    expect(await submit(d(16, 30))).toMatchObject({ ok: false }); // 16:00 예약 당시 약속한 뒤 준비 30분 보존
    const snap = dbm.db.prepare('SELECT before_min, after_min FROM aww_bookings WHERE start_ms = ? AND status = ?').get(d(16), 'confirmed') as any;
    expect([Number(snap.before_min), Number(snap.after_min)]).toEqual([0, 30]);
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} });
  });

  const lockThen = async (change: string, start: number) => {
    const sql = postgres(process.env.AWW_DATABASE_URL!, { max: 1, onnotice: () => {} });
    try {
      const q = sql.unsafe(`DO $$ BEGIN
        PERFORM 1 FROM aww_booking_pages WHERE user_id = '${owner}' FOR UPDATE;
        PERFORM pg_sleep(1.2);
        ${change}
      END $$`).execute();
      await new Promise((r) => setTimeout(r, 600));
      const c0 = calls.length;
      const t0 = Date.now();
      const r = await submit(start);
      const waited = Date.now() - t0;
      await q;
      const n = (dbm.db.prepare('SELECT COUNT(*)::int AS n FROM aww_bookings WHERE user_id = ? AND start_ms = ?').get(owner, start) as { n: number }).n;
      return { r, googleCalls: calls.length - c0, inserted: n, waited };
    } finally {
      await sql.end();
    }
  };

  it('QA024 P2: 잠금을 기다리는 사이 주소를 바꾸거나 끄거나 설정을 바꾸면, 옛 요청은 넣지도 구글에 보내지도 않음', async () => {
    const rotated = await lockThen(`UPDATE aww_booking_pages SET token_hash = 'rotated-elsewhere' WHERE user_id = '${owner}';`, kst(13, 10));
    expect(rotated).toMatchObject({ r: null, googleCalls: 0, inserted: 0 });
    expect(rotated.waited).toBeGreaterThan(400);
    token = bk.bookingHandlers.bookingSave(ctx(owner), { settings: {}, rotate: true }).token!;
    const off = await lockThen(`UPDATE aww_booking_pages SET enabled = 0 WHERE user_id = '${owner}';`, kst(13, 11));
    expect(off).toMatchObject({ r: null, googleCalls: 0, inserted: 0 });
    token = bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} }).token!;
    const s60 = JSON.stringify({ ...bk.DEFAULT_SETTINGS, slotMin: 60 }).replace(/'/g, "''");
    const changed = await lockThen(`UPDATE aww_booking_pages SET settings = '${s60}' WHERE user_id = '${owner}';`, kst(13, 12, 30));
    expect(changed.r).toMatchObject({ ok: false });
    expect(changed).toMatchObject({ googleCalls: 0, inserted: 0 });
    bk.bookingHandlers.bookingSave(ctx(owner), { settings: {} });
  });
});
