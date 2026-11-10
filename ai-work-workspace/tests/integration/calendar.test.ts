// 구글 캘린더 연동(2026-11-11) — 플랜 docs/PLAN_20261111_GOOGLE_CALENDAR.md §5 시험. 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

// 구글 연결·API는 모의(실제 구글을 부르지 않음)
const pushed: { rowId: string; eventId?: string | null }[] = [];
vi.mock('@/server/googleCalendar', async (orig) => {
  const real = await orig<typeof import('../../src/server/googleCalendar.ts')>();
  return {
    ...real,
    loadGcalAccount: async () => null,
    getGoogleApp: async () => null,
    validToken: async () => 'tok',
    upsertGoogleEvent: async (_t: string, e: { rowId: string }, id?: string | null) => { pushed.push({ rowId: e.rowId, eventId: id }); return id ?? `g-${e.rowId}`; },
    listGoogleEvents: async () => [
      { id: 'ev1', title: '고객 미팅', date: '2026-11-20', time: '10:00', location: '강남', link: 'https://calendar.google.com/x' },
    ],
  };
});

let data: typeof import('../../src/server/calendarData.ts');
let sync: typeof import('../../src/server/calendarSync.ts');
let gcal: typeof import('../../src/server/googleCalendar.ts');
let dbm: typeof import('../../src/litpage/server/db.ts');
const ctx = (userId: string) => ({ userId }) as never;

function seedMember(userId: string, prefix: string) {
  const put = dbm.putRecord as (t: string, r: Record<string, unknown>) => void;
  put('space', { id: `${prefix}-space`, version: 0, alive: true, domain: `${prefix}ws`, name: 'ws' });
  put('space_view', { id: `${prefix}-sv`, version: 0, alive: true, space_id: `${prefix}-space` });
  put('user_root', { id: userId, version: 0, space_views: [`${prefix}-sv`] });
  put('collection', { id: `${prefix}-col`, version: 0, alive: true, space_id: `${prefix}-space`, schema: { title: { name: '이름', type: 'title' }, due: { name: '마감일', type: 'date' } } });
  put('block', { id: `${prefix}-db`, version: 0, alive: true, type: 'collection_view_page', collection_id: `${prefix}-col`, space_id: `${prefix}-space`, properties: { title: [['일정 표']] } });
  put('block', { id: `${prefix}-r1`, version: 0, alive: true, type: 'page', parent_id: `${prefix}-col`, parent_table: 'collection', space_id: `${prefix}-space`, properties: { title: [['보고서, 마감; 확인']], due: [['‣', [['d', { type: 'date', start_date: '2026-11-15' }]]]] } });
  put('block', { id: `${prefix}-r2`, version: 0, alive: true, type: 'page', parent_id: `${prefix}-col`, parent_table: 'collection', space_id: `${prefix}-space`, properties: { title: [['회의']], due: [['‣', [['d', { type: 'datetime', start_date: '2026-11-16', start_time: '14:30' }]]]] } });
  put('block', { id: `${prefix}-r3`, version: 0, alive: true, type: 'page', parent_id: `${prefix}-col`, parent_table: 'collection', space_id: `${prefix}-space`, properties: { title: [['날짜 없음']] } });
}

beforeAll(async () => {
  dbm = await import('../../src/litpage/server/db.ts');
  data = await import('../../src/server/calendarData.ts');
  sync = await import('../../src/server/calendarSync.ts');
  gcal = await import('../../src/server/googleCalendar.ts');
  seedMember('member-a', 'a');
  seedMember('member-b', 'b');
});

describe('ICS 글자', () => {
  it('하루 종일·시간 있는 일정, 특수문자, 한국 시간대', () => {
    const ics = data.buildIcs('내 캘린더', [
      { rowId: 'r1', dbTitle: '표', title: '보고서, 마감; 확인', startDate: '2026-11-15', url: 'https://x/1' },
      { rowId: 'r2', dbTitle: '표', title: '회의', startDate: '2026-11-16', startTime: '14:30', url: 'https://x/2' },
    ], new Date('2026-11-11T00:00:00Z'));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261115');
    expect(ics).toContain('DTEND;VALUE=DATE:20261116');
    expect(ics).toContain('DTSTART;TZID=Asia/Seoul:20261116T143000');
    expect(ics).toContain('DTEND;TZID=Asia/Seoul:20261116T153000');
    expect(ics).toContain('SUMMARY:보고서\\, 마감\\; 확인');
    expect(ics.includes('\r\n')).toBe(true);
  });
  it('긴 한글 줄은 75바이트로 접고 글자를 쪼개지 않는다', () => {
    const line = 'SUMMARY:' + '가'.repeat(60);
    const folded = data.foldLine(line);
    for (const part of folded.split('\r\n')) expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
  it('구글 일정 본문: 종일은 date, 시간 있으면 dateTime + Asia/Seoul', () => {
    expect(gcal.toGoogleEvent({ rowId: 'r', dbTitle: '표', title: 'A', startDate: '2026-11-15', url: 'u' })).toMatchObject({ start: { date: '2026-11-15' }, end: { date: '2026-11-16' } });
    expect(gcal.toGoogleEvent({ rowId: 'r', dbTitle: '표', title: 'B', startDate: '2026-11-16', startTime: '23:30', url: 'u' })).toMatchObject({ start: { dateTime: '2026-11-16T23:30:00', timeZone: 'Asia/Seoul' }, end: { dateTime: '2026-11-17T00:30:00' } });
  });
});

describe('표 찾기·회원 격리', () => {
  it('날짜 칸 있는 내 표만, 날짜 빈 행은 뺀다', () => {
    expect(data.listDateDatabases('member-a').map((d) => d.id)).toEqual(['a-db']);
    const ev = data.databaseEvents('member-a', 'a-db');
    expect(ev.map((e) => e.title).sort()).toEqual(['보고서, 마감; 확인', '회의']);
    expect(data.databaseEvents('member-a', 'b-db')).toEqual([]);
  });
});

describe('① 간편 구독(ICS)', () => {
  it('주소는 만들 때만 받고, 토큰 해시로만 찾는다. 다시 만들면 옛 주소 무효', () => {
    const r1 = sync.calendarHandlers.calFeedSave(ctx('member-a'), { dbs: [{ id: 'a-db' }] });
    const t1 = r1.url.split('/api/calendar/')[1].replace('.ics', '');
    const feed = sync.feedForToken(t1)!;
    expect(feed.userId).toBe('member-a');
    expect(feed.ics).toContain('SUMMARY:회의');
    const r2 = sync.calendarHandlers.calFeedSave(ctx('member-a'), { dbs: [{ id: 'a-db' }] });
    expect(r2.url).toBeNull(); // 표만 바꾸면 주소 그대로
    const r3 = sync.calendarHandlers.calFeedSave(ctx('member-a'), { dbs: [{ id: 'a-db' }], rotate: true });
    expect(sync.feedForToken(t1)).toBeNull();
    expect(sync.feedForToken(r3.url.split('/api/calendar/')[1].replace('.ics', ''))?.userId).toBe('member-a');
  });
  it('다른 회원 표는 고를 수 없다', () => {
    expect(() => sync.calendarHandlers.calFeedSave(ctx('member-a'), { dbs: [{ id: 'b-db' }] })).toThrow(/표를 하나 이상/);
  });
  it('엉뚱한 토큰은 못 읽는다', () => {
    expect(sync.feedForToken('x'.repeat(43))).toBeNull();
    expect(sync.feedForToken('../../etc')).toBeNull();
  });
});

describe('② 구글 계정 연결 — 보내기 중복 방지', () => {
  it('처음엔 만들고, 다시 보내면 같은 구글 일정을 고친다', async () => {
    const r1 = await sync.calendarHandlers.calPushToGoogle(ctx('member-a'), { dbId: 'a-db' });
    expect(r1).toMatchObject({ created: 2, total: 2 });
    pushed.length = 0;
    const r2 = await sync.calendarHandlers.calPushToGoogle(ctx('member-a'), { dbId: 'a-db' });
    expect(r2).toMatchObject({ created: 0, updated: 2 });
    expect(pushed.every((p) => p.eventId === `g-${p.rowId}`)).toBe(true);
  });
  it('다른 회원 표는 보낼 수 없다', async () => {
    await expect(sync.calendarHandlers.calPushToGoogle(ctx('member-a'), { dbId: 'b-db' })).rejects.toThrow(/표를 찾지/);
  });
});
