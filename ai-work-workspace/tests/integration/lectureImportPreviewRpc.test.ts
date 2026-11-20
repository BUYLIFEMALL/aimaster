// 강의 일정 미리보기 명령(previewLectureImport) — 2026-11-20 WS-LECTURE-PREVIEW-ONLY(플랜 §19).
// 확인: 요청 형식 400 · 권한(공간·표) · 남의 파일·없는 파일의 같은 응답 · 미리보기 한도 · 키 없음 200/표식 없음 · 짧은 키 · 표식 왕복 ·
// 공개 오류 칸 허용 목록 · 최종 본문 예산 · 보이는 살아 있는 행만 중복 근거 · **DB 0쓰기**(회원 첫 접근·이메일 변경·권한 거절 포함).
// 자료는 모두 익명 합성 값이다(실제 강의 파일·개인 정보 없음). 서명 키는 이 파일 안의 고정 바이트를 주입한다(환경변수 없음).
// 로컬 Postgres 전용 fixture만 쓴다.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let ratelimit: typeof import('../../src/litpage/server/ratelimit.ts');
let importMod: typeof import('../../src/litpage/server/api/modules/import.ts');
let token: typeof import('../../src/litpage/server/content/lectureImport/previewToken.ts');
let publicError: typeof import('../../src/litpage/server/content/lectureImport/publicError.ts');
let assemble: typeof import('../../src/litpage/server/content/lectureImport/assemble.ts');

const kim = { id: '56565656-5656-4656-8656-565656565656', email: 'lecture-kim@example.com', name: '킴' };
const lee = { id: '78787878-7878-4878-8878-787878787878', email: 'lecture-lee@example.com', name: '리' };
/** 한 번도 워크스페이스를 연 적 없는 회원(회원 레코드 없음) */
const fresh = { id: '9a9a9a9a-9a9a-4a9a-8a9a-9a9a9a9a9a9a', email: 'lecture-fresh@example.com', name: '새' };
type M = typeof kim;
const KEY = new Uint8Array(32).fill(11);
const SHORT_KEY = new Uint8Array(31).fill(11);
const spaces = new Map<string, string>();
const sp = (m: M) => spaces.get(m.id)!;

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  ratelimit = await import('../../src/litpage/server/ratelimit.ts');
  importMod = await import('../../src/litpage/server/api/modules/import.ts');
  token = await import('../../src/litpage/server/content/lectureImport/previewToken.ts');
  publicError = await import('../../src/litpage/server/content/lectureImport/publicError.ts');
  assemble = await import('../../src/litpage/server/content/lectureImport/assemble.ts');
  for (const m of [kim, lee]) {
    await runtime.runRpc('loadAccountData', {}, m);
    const r = await runtime.runRpc('createWorkspace', { name: `${m.name} 강의 시험` }, m);
    const id = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
    expect(id).toBeTruthy();
    spaces.set(m.id, id);
  }
});

beforeEach(() => {
  runtime.setLecturePreviewTestOverrides({});
  for (const m of [kim, lee, fresh]) for (const k of [`lecture-preview:${m.id}`, `import:${m.id}`, `import-stored:${m.id}`]) ratelimit.reset(k);
});

// ── 합성 자료 ─────────────────────────────────────────────
const csvOf = (rows: string[][], head = ['제목', '날짜']) => '﻿' + [head, ...rows].map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n') + '\r\n';
const lessons = (n: number) => Array.from({ length: n }, (_, i) => [`합성 강의 ${i + 1}`, `2026년 3월 ${(i % 28) + 1}일 오후 7:30 (GMT+9)`]);
const store = (m: M, name: string, text: string) => db.withRequestCache(() => files.storeFile(name, Buffer.from(text, 'utf8'), m.id, sp(m), 'text/csv'));
const base = (m: M, url: string, over: Record<string, unknown> = {}) => ({
  spaceId: sp(m), url, name: 'lecture.csv', target: { kind: 'new' }, mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', wallClock: false, ...over,
});
const preview = (m: { id: string; email: string; name: string }, body: unknown) => runtime.runRpc('previewLectureImport', body, m);
const keysOf = (b: unknown) => Object.keys(b as object).sort();
const noId = (b: any) => { const { errorId, ...rest } = b; expect(typeof errorId).toBe('string'); return rest; };
const bytes = (b: unknown) => Buffer.byteLength(JSON.stringify(b));

/** DB의 모든 표: 줄 수와 내용 해시. 미리보기 앞뒤가 같아야 한다(0쓰기) */
function snapshot(): Record<string, string> {
  const tables = db.db.prepare("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY 1").all() as { t: string }[];
  expect(tables.length).toBeGreaterThan(5);
  const out: Record<string, string> = {};
  for (const { t } of tables) {
    const r = db.db.prepare(`SELECT count(*)::int AS n, md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM "${t}" x`).get() as { n: number; h: string };
    out[t] = `${r.n}:${r.h}`;
  }
  return out;
}
async function zeroWrites<T>(fn: () => Promise<T>): Promise<T> {
  const before = snapshot();
  const r = await fn();
  expect(snapshot()).toEqual(before);
  return r;
}

/** importFiles로 「제목·날짜」 표를 만들고 블록 id와 행들을 돌려준다(시험 준비 — 미리보기 밖) */
async function makeTable(m: M, rows: string[][]) {
  const f = store(m, '기존 표.csv', 'Name,Date\n' + rows.map((r) => r.join(',')).join('\n') + '\n');
  const r = await runtime.runRpc('importFiles', { spaceId: sp(m), parent: { kind: 'private' }, files: [{ name: '기존 표.csv', url: f.url }], csvTypes: { 1: 'date' } }, m);
  expect(r.status).toBe(200);
  const blockId = (r.body as any).pageIds[0] as string;
  const block = db.withRequestCache(() => db.getRecord<any>('block', blockId));
  const col = db.withRequestCache(() => db.getRecord<any>('collection', block.collection_id));
  const rowIds = (db.db.prepare("SELECT id FROM records WHERE tbl = 'block' AND parent_id = ? AND alive = 1 ORDER BY id").all(col.id) as { id: string }[]).map((x) => x.id);
  return { blockId, colId: col.id as string, rowIds, schema: col.schema as Record<string, { name: string; type: string }> };
}

describe('previewLectureImport — 성공과 키', () => {
  it('키 없음: 200, 판정 칸만(token·expiresAt 없음). DB 0쓰기', async () => {
    const f = store(kim, 'a.csv', csvOf([...lessons(3), ['', ''], lessons(1)[0]]));
    const r = await zeroWrites(() => preview(kim, base(kim, f.url)));
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(keysOf(b)).toEqual(['dupOf', 'rows', 'totals']);
    expect(b.totals).toEqual({ rows: 5, created: 3, duplicate: 1, failed: 1, tz_mismatch: 0, wall_clock: 0, similar: 0 });
    expect(JSON.stringify(b)).not.toContain('합성 강의'); // 칸 내용은 싣지 않는다
  });

  it('31바이트 키는 키 없음과 같다: 200·표식 없음(500 아님)', async () => {
    runtime.setLecturePreviewTestOverrides({ key: SHORT_KEY });
    const f = store(kim, 'b.csv', csvOf(lessons(2)));
    const r = await zeroWrites(() => preview(kim, base(kim, f.url)));
    expect(r.status).toBe(200);
    expect(keysOf(r.body)).toEqual(['dupOf', 'rows', 'totals']);
  });

  it('키 있음: token·expiresAt이 붙고, 같은 키·같은 요청으로 확인을 통과한다. 다른 요청이면 intent_mismatch. DB 0쓰기', async () => {
    runtime.setLecturePreviewTestOverrides({ key: KEY });
    const text = csvOf(lessons(4));
    const f = store(kim, 'c.csv', text);
    const r = await zeroWrites(() => preview(kim, base(kim, f.url)));
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(keysOf(b)).toEqual(['dupOf', 'expiresAt', 'rows', 'token', 'totals']);
    expect(b.token).not.toContain(kim.id);
    const intent = { userId: kim.id, spaceId: sp(kim), target: { kind: 'new' as const }, fileId: f.id, fileSha256: token.sha256Hex(Buffer.from(text, 'utf8')), mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', wallClock: false };
    const empty = { columns: [], viewIds: [] };
    expect(token.verifyPreviewToken(KEY, b.token, intent, empty, Date.now())).toMatchObject({ ok: true, expiresAt: b.expiresAt });
    expect(token.verifyPreviewToken(KEY, b.token, { ...intent, userId: lee.id }, empty, Date.now())).toEqual({ ok: false, code: 'intent_mismatch' });
    expect(token.verifyPreviewToken(KEY, b.token, { ...intent, wallClock: true }, empty, Date.now())).toEqual({ ok: false, code: 'intent_mismatch' });
  });
});

describe('previewLectureImport — 요청 형식·권한·파일 소유', () => {
  it('로그인 없음은 401(명령 직접 호출)', async () => {
    await expect(Promise.resolve().then(() => importMod.handlers.previewLectureImport({ userId: null, setCookie: () => {} } as any, {}))).rejects.toMatchObject({ status: 401 });
  });

  it('요청 칸의 형·길이 오류는 400·공개 코드 없음 — 권한 확인보다 먼저(남의 공간을 적어도 같은 400)', async () => {
    const f = store(kim, 'd.csv', csvOf(lessons(1)));
    const bad: Record<string, unknown>[] = [
      { spaceId: '' }, { spaceId: 5 }, { url: 'x'.repeat(513) }, { timeZone: '' }, { wallClock: 'false' }, { wallClock: undefined },
      { mapping: { title: '제목' } }, { mapping: null }, { target: { kind: 'other' } }, { target: { kind: 'table' } }, { target: null }, { name: '' },
    ];
    for (const over of bad) {
      for (const spaceId of [sp(kim), sp(lee)]) {
        const r = await zeroWrites(() => preview(kim, { ...base(kim, f.url), spaceId, ...over }));
        expect(r.status, JSON.stringify(over)).toBe(400);
        expect(keysOf(r.body)).toEqual(['errorId', 'message', 'name']);
      }
    }
    expect(ratelimit.count(`lecture-preview:${kim.id}`, 600_000)).toBe(0);
  });

  it('남의 공간 403 · 남의 표 404 — 파일을 읽기 전(없는 파일 주소여도 404가 아니라 권한 오류), 한도를 세지 않음, 0쓰기', async () => {
    const leeTable = await makeTable(lee, [['리 강의', '2026-03-01']]);
    const missing = 'https://x.test/files/00000000-0000-4000-8000-000000000000/a.csv';
    const r1 = await zeroWrites(() => preview(kim, { ...base(kim, missing), spaceId: sp(lee) }));
    expect(r1.status).toBe(403);
    const r2 = await zeroWrites(() => preview(kim, { ...base(kim, missing), target: { kind: 'table', blockId: leeTable.blockId } }));
    expect(r2.status).toBe(404);
    expect((r2.body as any).message).toBe('Not found');
    for (const r of [r1, r2]) expect(keysOf(r.body)).toEqual(['errorId', 'message', 'name']);
    expect(ratelimit.count(`lecture-preview:${kim.id}`, 600_000)).toBe(0);
  });

  it('남의 파일 · 없는 파일 · 모양이 틀린 주소: errorId를 뺀 응답이 모두 같다(404), 0쓰기', async () => {
    const leeFile = store(lee, 'lee.csv', csvOf(lessons(1)));
    const urls = [leeFile.url, 'https://x.test/files/00000000-0000-4000-8000-000000000000/lecture.csv', 'not-a-file-url'];
    const bodies = [];
    for (const url of urls) {
      const r = await zeroWrites(() => preview(kim, base(kim, url)));
      expect(r.status).toBe(404);
      bodies.push(noId(r.body));
    }
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    expect(JSON.stringify(bodies[0])).not.toContain(leeFile.id);
  });
});

describe('previewLectureImport — DB 0쓰기 게이트(실행기)', () => {
  it('처음 들어온 회원(회원 레코드 없음): 403으로 거절, 회원 레코드를 만들지 않음, DB 전체 0변화', async () => {
    const r = await zeroWrites(() => preview(fresh, { ...base(kim, 'x'), spaceId: sp(kim) }));
    expect(r.status).toBe(403);
    expect(keysOf(r.body)).toEqual(['errorId', 'message', 'name']);
    expect(db.withRequestCache(() => db.getRecord('lit_user', fresh.id))).toBeUndefined();
    // 다른 명령은 예전처럼 회원을 만든다(동작 변화 없음)
    await runtime.runRpc('loadAccountData', {}, { ...fresh });
    expect(db.withRequestCache(() => db.getRecord('lit_user', fresh.id))).toBeTruthy();
  });

  it('이메일이 바뀐 회원: 미리보기는 이메일을 맞추지 않는다(성공·0쓰기). 다른 명령은 예전처럼 맞춘다', async () => {
    const f = store(kim, 'e.csv', csvOf(lessons(2)));
    const moved = { ...kim, email: 'lecture-kim-new@example.com' };
    const r = await zeroWrites(() => preview(moved, base(kim, f.url)));
    expect(r.status).toBe(200);
    expect((db.withRequestCache(() => db.getRecord<any>('lit_user', kim.id)) as any).email).toBe(kim.email);
    await runtime.runRpc('loadAccountData', {}, moved);
    expect((db.withRequestCache(() => db.getRecord<any>('lit_user', kim.id)) as any).email).toBe(moved.email);
    await runtime.runRpc('loadAccountData', {}, kim); // 되돌림
  });
});

describe('previewLectureImport — 파일 오류의 공개 칸', () => {
  const run = async (text: string, over: Record<string, unknown> = {}) => {
    const f = store(kim, 'f.csv', text);
    return zeroWrites(() => preview(kim, base(kim, f.url, over)));
  };
  it('구조 오류는 400 file_invalid + 그 파일의 사유·줄/열만', async () => {
    const r1 = await run('﻿제목,날짜\r\n"닫히지 않음,2026-03-01\r\n');
    expect(r1.status).toBe(400);
    expect(noId(r1.body)).toMatchObject({ name: 'ValidationError', code: 'file_invalid', detail: { reason: 'unterminated_quote', line: 2 } });
    expect(keysOf((r1.body as any).detail)).toEqual(['line', 'reason']);
    const r2 = await run('제목,제목\r\nA,2026-03-01\r\n');
    expect((r2.body as any).detail).toEqual({ reason: 'duplicate_header', column: 2 });
    expect(keysOf(r2.body)).toEqual(['code', 'detail', 'errorId', 'message', 'name']);
  });
  it('시간대·열 지정 오류는 사유만 — 요청이 보낸 시간대·열 이름을 되돌려 싣지 않는다', async () => {
    const r1 = await run(csvOf(lessons(1)), { timeZone: 'Mars/Olympus_Mons' });
    expect((r1.body as any).detail).toEqual({ reason: 'zone_invalid' });
    expect(JSON.stringify(r1.body)).not.toContain('Olympus');
    const r2 = await run(csvOf(lessons(1)), { mapping: { title: '없는열이름XYZ', date: '날짜' } });
    expect((r2.body as any).detail).toEqual({ reason: 'title_column_missing' });
    expect(JSON.stringify(r2.body)).not.toContain('없는열이름XYZ');
  });
  it('데이터 10,000줄은 통과, 10,001줄은 413 too_many_rows·limit 10000(실제 줄 수 없음)', async () => {
    const ok = await run(csvOf(lessons(10_000)));
    expect(ok.status).toBe(200);
    expect((ok.body as any).totals.rows).toBe(10_000);
    const over = await run(csvOf(lessons(10_001)));
    expect(over.status).toBe(413);
    expect(noId(over.body)).toEqual({ name: 'ValidationError', message: expect.any(String), code: 'too_many_rows', limit: 10_000 });
    expect(JSON.stringify(over.body)).not.toContain('10001');
  });
});

describe('previewLectureImport — 기존 표의 중복 근거', () => {
  it('보이는 살아 있는 행만 근거가 된다 — 휴지통 행은 id·집계·사유 어디에도 없다. 0쓰기', async () => {
    const t = await makeTable(kim, [['기존 강의 가', '2026-04-01'], ['기존 강의 나', '2026-04-02']]);
    expect(Object.values(t.schema).some((p) => p.type === 'date')).toBe(true);
    // 「나」 행을 휴지통으로(시험 준비)
    const trashedId = t.rowIds.find((id) => JSON.stringify(db.withRequestCache(() => db.getRecord<any>('block', id)).properties.title).includes('나'))!;
    db.withRequestCache(() => { const row = db.getRecord<any>('block', trashedId); db.putRecord('block', { ...row, alive: false, version: row.version + 1 }); });
    const f = store(kim, 'g.csv', csvOf([['기존 강의 가', '2026년 4월 1일'], ['기존 강의 나', '2026년 4월 2일'], ['새 강의', '2026년 4월 3일']], ['제목', 'Date']));
    const r = await zeroWrites(() => preview(kim, base(kim, f.url, { target: { kind: 'table', blockId: t.blockId }, mapping: { title: '제목', date: 'Date' } })));
    expect(r.status).toBe(200);
    const b = r.body as any;
    expect(b.totals).toMatchObject({ rows: 3, created: 2, duplicate: 1 });
    const liveId = t.rowIds.find((id) => id !== trashedId);
    expect(b.dupOf.filter((x: unknown) => typeof x === 'string')).toEqual([liveId]);
    expect(JSON.stringify(b)).not.toContain(trashedId);
  });

  it('키 있음 + 기존 표: 표식의 구조 지문은 그 표의 열·보기로 만들어진다', async () => {
    runtime.setLecturePreviewTestOverrides({ key: KEY });
    const t = await makeTable(kim, [['구조 시험', '2026-05-01']]);
    const text = csvOf([['다른 강의', '2026년 5월 2일']], ['제목', 'Date']);
    const f = store(kim, 'h.csv', text);
    const r = await preview(kim, base(kim, f.url, { target: { kind: 'table', blockId: t.blockId }, mapping: { title: '제목', date: 'Date' } }));
    expect(r.status).toBe(200);
    const block = db.withRequestCache(() => db.getRecord<any>('block', t.blockId));
    const structure = { columns: Object.entries(t.schema).map(([id, p]) => ({ id, name: p.name, type: p.type })), viewIds: block.view_ids };
    const intent = { userId: kim.id, spaceId: sp(kim), target: { kind: 'table' as const, blockId: t.blockId }, fileId: f.id, fileSha256: token.sha256Hex(Buffer.from(text, 'utf8')), mapping: { title: '제목', date: 'Date' }, timeZone: 'Asia/Seoul', wallClock: false };
    expect(token.verifyPreviewToken(KEY, (r.body as any).token, intent, structure, Date.now()).ok).toBe(true);
    expect(token.verifyPreviewToken(KEY, (r.body as any).token, intent, { ...structure, viewIds: [] }, Date.now())).toEqual({ ok: false, code: 'structure_changed' });
  });
});

describe('previewLectureImport — 한도와 예산', () => {
  it('미리보기 한도 30회: 31번째 429. 가져오기 횟수(import:)는 줄지 않는다', async () => {
    const f = store(kim, 'i.csv', csvOf(lessons(1)));
    for (let i = 0; i < 30; i++) expect((await preview(kim, base(kim, f.url))).status).toBe(200);
    const r = await zeroWrites(() => preview(kim, base(kim, f.url)));
    expect(r.status).toBe(429);
    expect(noId(r.body)).toMatchObject({ name: 'RateLimitedError' });
    expect(keysOf(r.body)).toEqual(['errorId', 'message', 'name']);
    expect(ratelimit.count(`import:${kim.id}`, 12 * 3600_000)).toBe(0);
  });

  for (const withKey of [true, false]) {
    it(`최종 본문 예산(키 ${withKey ? '있음' : '없음'}): 예산 = 최종 본문 크기 S면 잘림 없음, S−1이면 줄별 상세가 잘리되 예산 이하, 최소 본문 M이면 상세 0개로 성공·M−1이면 500·공개 칸 없음`, async () => {
      runtime.setLecturePreviewTestOverrides(withKey ? { key: KEY } : {});
      const text = csvOf(lessons(40));
      const f = store(kim, 'j.csv', text);
      const full = await preview(kim, base(kim, f.url));
      expect(full.status).toBe(200);
      const S = bytes(full.body);
      expect('token' in (full.body as object)).toBe(withKey);
      runtime.setLecturePreviewTestOverrides({ ...(withKey ? { key: KEY } : {}), budget: S });
      const exact = await preview(kim, base(kim, f.url));
      expect(exact.status).toBe(200);
      expect('rowsOmitted' in (exact.body as object)).toBe(false);
      expect(bytes(exact.body)).toBe(S);
      runtime.setLecturePreviewTestOverrides({ ...(withKey ? { key: KEY } : {}), budget: S - 1 });
      const cut = await preview(kim, base(kim, f.url));
      expect(cut.status).toBe(200);
      expect(bytes(cut.body)).toBeLessThanOrEqual(S - 1);
      expect((cut.body as any).rowsOmitted).toBeGreaterThan(0);
      expect((cut.body as any).totals).toEqual((full.body as any).totals);
      expect('token' in (cut.body as object)).toBe(withKey);
      // 최소 본문 M = (판정 칸만의 최소 크기 needed — 순수 모듈로 따로 계산) + (표식 칸이 붙는 바이트)
      const judged = assemble.assembleLectureImport({ csv: text, mapping: { title: '제목', date: '날짜' }, timeZone: 'Asia/Seoul', wallClock: false, existing: [] });
      expect(judged.ok).toBe(true);
      const probe = assemble.buildLectureResponse(judged as any, { budget: 1 });
      expect(probe.ok).toBe(false);
      const needed = (probe as any).error.needed as number;
      const { token: _t, expiresAt: _e, ...judgedOnly } = full.body as any;
      const suffix = S - bytes(judgedOnly);
      expect(suffix > 0).toBe(withKey);
      const M = needed + suffix;
      runtime.setLecturePreviewTestOverrides({ ...(withKey ? { key: KEY } : {}), budget: M });
      const min = await zeroWrites(() => preview(kim, base(kim, f.url)));
      expect(min.status).toBe(200);
      expect((min.body as any).rows).toEqual([]);
      expect((min.body as any).rowsOmitted).toBe(40);
      expect(bytes(min.body)).toBeLessThanOrEqual(M);
      expect('token' in (min.body as object)).toBe(withKey);
      runtime.setLecturePreviewTestOverrides({ ...(withKey ? { key: KEY } : {}), budget: M - 1 });
      const tiny = await zeroWrites(() => preview(kim, base(kim, f.url)));
      expect(tiny.status).toBe(500);
      expect(noId(tiny.body)).toEqual({ name: 'InternalError', message: '요청을 처리하는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.' });
    });
  }

  it('같은 예산에서 키가 있으면 줄별 상세가 같거나 적다(표식 칸까지 예산에 들어감)', async () => {
    const f = store(kim, 'k.csv', csvOf(lessons(40)));
    runtime.setLecturePreviewTestOverrides({ budget: 1500 });
    const without = (await preview(kim, base(kim, f.url))).body as any;
    runtime.setLecturePreviewTestOverrides({ key: KEY, budget: 1500 });
    const withK = (await preview(kim, base(kim, f.url))).body as any;
    expect(bytes(withK)).toBeLessThanOrEqual(1500);
    expect(withK.rows.length).toBeLessThanOrEqual(without.rows.length);
  });
});

describe('공개 오류 칸 — 기존 명령 호환과 허용 목록', () => {
  it('기존 명령의 오류 본문은 예전 세 칸 그대로', async () => {
    const r = await runtime.runRpc('previewCsv', { spaceId: sp(kim), url: 'not-a-file-url', name: 'a.csv' }, kim);
    expect(r.status).toBe(404);
    expect(keysOf(r.body)).toEqual(['errorId', 'message', 'name']);
  });
  it('허용 목록: 목록 밖 code·500 이상·허용되지 않은 칸은 싣지 않는다', () => {
    const f = publicError.publicErrorFields;
    expect(f(409, { code: 'not_in_list', detail: { a: 1 } })).toEqual({});
    for (const st of [500, 503, 399, 200]) expect(f(st, { code: 'file_invalid', detail: { reason: 'no_header' }, limit: 10000 })).toEqual({});
    expect(f(409, { code: 'preview_invalid', detail: { reason: 'bad_signature' }, limit: 1 })).toEqual({ code: 'preview_invalid' });
    expect(f(413, { code: 'too_many_rows', limit: 10001 })).toEqual({ code: 'too_many_rows' });
    expect(f(413, { code: 'too_many_rows', limit: 10000, detail: { reason: 'no_header' } })).toEqual({ code: 'too_many_rows', limit: 10000 });
    expect(f(400, { code: 'file_invalid', detail: { reason: 'secret_internal' } })).toEqual({ code: 'file_invalid' });
    expect(f(400, { code: 'file_invalid', detail: { reason: 'no_header', line: 3, column: 2, sql: 'x' } })).toEqual({ code: 'file_invalid', detail: { reason: 'no_header' } });
    expect(f(400, { code: 'file_invalid', detail: { reason: 'unterminated_quote', line: 2.5, column: 1 } })).toEqual({ code: 'file_invalid', detail: { reason: 'unterminated_quote' } });
    expect(f(400, { code: 'file_invalid', detail: { reason: 'duplicate_header', column: 3, line: 9 } })).toEqual({ code: 'file_invalid', detail: { reason: 'duplicate_header', column: 3 } });
    expect(f(400, null)).toEqual({});
  });
});
