// 일반 ZIP 가져오기(importFiles) 성능 진단 — WS-20261119-03, Master msg_aa669ac3568e.
// 2026-11-19 운영에서 약 510KB 노션 ZIP(Markdown 약 570쪽 + CSV 약 10개, 그림 없음)이 300초 제한으로 504가 났다.
// 같은 모양의 합성 ZIP으로 쪽 수를 늘려 가며 단계 시간과 DB 호출 수를 잰다(사용자 자료는 쓰지 않는다).
// 평소 시험 묶음에서는 돌지 않는다: IMPORT_PERF_PAGES="20,60,120" 처럼 쪽 수를 넘겨야 실행된다.
// 로컬 전용 fixture만 쓴다(AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL).
import { appendFileSync } from 'node:fs';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

const SIZES = (process.env.IMPORT_PERF_PAGES ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
const BLOCKS_PER_PAGE = Number(process.env.IMPORT_PERF_BLOCKS ?? 24);
const LIMIT_MS = Number(process.env.IMPORT_PERF_LIMIT_MS ?? 240_000);

// DB 다리를 감싸 호출 수와 걸린 시간을 문장 모양별로 센다
const stat = { on: false, calls: 0, ms: 0, by: new Map<string, { n: number; ms: number }>() };
const shape = (sql: string) => sql.replace(/\s+/g, ' ').trim().replace(/\$\d+/g, '?').replace(/\((\?,? ?)+\)/g, '(?…)').slice(0, 70);
vi.mock('../../src/litpage/server/pg/bridge.ts', async (orig) => {
  const real = (await orig()) as Record<string, any>;
  const wrap = (fn: (...a: any[]) => any) => (...a: any[]) => {
    if (!stat.on) return fn(...a);
    const t = performance.now();
    try {
      return fn(...a);
    } finally {
      const d = performance.now() - t;
      stat.calls++;
      stat.ms += d;
      const k = shape(String(a[0]));
      const e = stat.by.get(k) ?? { n: 0, ms: 0 };
      e.n++;
      e.ms += d;
      stat.by.set(k, e);
    }
  };
  return { ...real, querySync: wrap(real.querySync), execSync: wrap(real.execSync) };
});

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');

const pat = { id: '77777777-7777-4777-8777-777777777777', email: 'perf-pat@example.com', name: '팻' };
let spaceId = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  await runtime.runRpc('loadAccountData', {}, pat);
  const r = await runtime.runRpc('createWorkspace', { name: '성능 진단' }, pat);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
});

const hex = (i: number) => i.toString(16).padStart(32, '0');
const body = (title: string) => {
  const out = [`# ${title}`, ''];
  for (let i = 0; out.length < BLOCKS_PER_PAGE * 2; i++) {
    out.push(i % 6 === 0 ? `## 소제목 ${i}` : i % 6 === 1 ? `- 목록 항목 ${i} **굵게**` : i % 6 === 2 ? `- [ ] 할 일 ${i}` : `문단 ${i} — 합성 본문입니다. [바깥](https://example.com/${i})`, '');
  }
  return out.join('\n');
};

/** 노션 Markdown+CSV 내보내기 모양: 맨 위 페이지 1 + 데이터베이스 10개(CSV + 행 페이지) — 전체 Markdown 수가 pages개 */
function synthetic(pages: number) {
  const dbs = 10;
  const perDb = Math.max(1, Math.floor((pages - 1) / dbs));
  const root = `Root ${hex(1)}`;
  const entries: { name: string; data: string }[] = [];
  const links: string[] = [];
  let made = 1;
  for (let d = 0; d < dbs && made < pages; d++) {
    const dbName = `Table${d} ${hex(1000 + d)}`;
    const rows = ['Name,Status,Count'];
    for (let r = 0; r < perDb && made < pages; r++, made++) {
      const title = `Row ${d}-${r}`;
      rows.push(`${title},${r % 2 ? 'Done' : 'Todo'},${r}`);
      entries.push({ name: `${root}/${dbName}/${title} ${hex(100000 + d * 10000 + r)}.md`, data: body(title) });
    }
    entries.push({ name: `${root}/${dbName}.csv`, data: rows.join('\n') + '\n' });
    links.push(`[${dbName}](${encodeURIComponent(root)}/${encodeURIComponent(dbName)}.csv)`);
  }
  entries.unshift({ name: `${root}.md`, data: `# Root\n\n${links.join('\n\n')}\n` });
  return { entries, markdown: made, csv: Math.min(dbs, entries.filter((e) => e.name.endsWith('.csv')).length) };
}

const count = (t: string) => Number((db.db.prepare('SELECT count(*) AS n FROM records WHERE tbl = ?').get(t) as { n: number }).n);

describe.skipIf(!SIZES.length)('일반 ZIP 가져오기 성능 진단', () => {
  for (const pages of SIZES) {
    it(`Markdown ${pages}쪽`, async () => {
      const s = synthetic(pages);
      const t0 = performance.now();
      const buf = zip.writeZip(s.entries);
      const up = db.withRequestCache(() => files.storeFile('perf.zip', buf, pat.id, spaceId, 'application/zip'));
      const before = { block: count('block'), collection: count('collection') };
      stat.calls = 0;
      stat.ms = 0;
      stat.by.clear();
      stat.on = true;
      const t1 = performance.now();
      const r = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name: 'perf.zip', url: up.url }] }, pat);
      const total = performance.now() - t1;
      stat.on = false;
      const top = [...stat.by.entries()].sort((a, z) => z[1].ms - a[1].ms).slice(0, 8).map(([k, v]) => ({ 문장: k, 횟수: v.n, ms: Math.round(v.ms) }));
      const after = { block: count('block'), collection: count('collection') };
      const line = JSON.stringify({
        쪽수: s.markdown, CSV: s.csv, ZIP바이트: buf.length, 준비ms: Math.round(t1 - t0), 상태: r.status,
        전체ms: Math.round(total), DB호출: stat.calls, DBms: Math.round(stat.ms), DB밖ms: Math.round(total - stat.ms),
        새블록: after.block - before.block, 새컬렉션: after.collection - before.collection,
        블록당호출: +(stat.calls / Math.max(1, after.block - before.block)).toFixed(2), 블록당ms: +(total / Math.max(1, after.block - before.block)).toFixed(2),
        응답바이트: JSON.stringify(r.body ?? null).length, 문장상위: top,
      });
      // 결과는 화면과, IMPORT_PERF_OUT이 있으면 그 파일(한 줄에 하나)에도 남긴다
      console.log(line);
      if (process.env.IMPORT_PERF_OUT) appendFileSync(process.env.IMPORT_PERF_OUT, `${line}\n`);
      // 실패(제한 초과 포함)면 아무것도 남지 않아야 한다
      if (r.status !== 200) expect(after).toEqual(before);
      expect(total).toBeLessThan(LIMIT_MS);
    }, LIMIT_MS + 60_000);
  }
});

// 2026-11-19 Master msg_81e5f70393f6: 버전 기록(스냅숏)이 쪽이 아닌 블록 id로 저장되는 현상의 재현(측정만, 제품 수정 없음).
// IMPORT_PERF_SNAP=1 일 때만 실행. 같은 내용(페이지 아래 토글 1 + 그 안의 문단 3)을 쓰는 순서만 바꿔 스냅숏이 어느 id로 생기는지 본다.
describe.skipIf(!process.env.IMPORT_PERF_SNAP)('스냅숏이 블록 id로 저장되는 조건', () => {
  const snapshotsByType = () => Object.fromEntries((db.db.prepare(
    `SELECT COALESCE(aww_type.t, '(없음)') AS t, count(*) AS n FROM snapshots s
     LEFT JOIN LATERAL (SELECT (r.data::jsonb->>'type') AS t FROM records r WHERE r.tbl = 'block' AND r.id = s.page_id) aww_type ON true
     GROUP BY 1 ORDER BY 1`,
  ).all() as { t: string; n: number }[]).map((r) => [r.t, Number(r.n)]));
  const diff = (after: Record<string, number>, before: Record<string, number>) => Object.fromEntries(Object.keys(after).map((k) => [k, after[k] - (before[k] ?? 0)]).filter(([, n]) => n));
  let seq = 0;
  const id = () => `00000000-0000-4000-9000-${String(++seq).padStart(12, '0')}`;

  const scenario = async (label: string, order: 'parent-first' | 'child-first') => {
    const records = await import('../../src/litpage/server/records.ts');
    const made = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name: `${label}.md`, url: db.withRequestCache(() => files.storeFile(`${label}.md`, `# ${label}\n\n본문\n`, pat.id, spaceId, 'text/markdown')).url }] }, pat);
    const pageId = (made.body as any).pageIds[0] as string;
    // 방금 만든 페이지의 스냅숏 간격(10분)에 걸리지 않게, 이 페이지의 기존 스냅숏 시각을 과거로 옮긴다(시험 DB 안에서만)
    db.db.prepare('UPDATE snapshots SET created_time = created_time - 3600000 WHERE page_id = ?').run(pageId);
    const toggle = id();
    const kids = [id(), id(), id()];
    const set = (bid: string, parent: string, type: string, content?: string[]) => ({ pointer: { table: 'block', id: bid, spaceId }, path: [], command: 'set', args: { id: bid, type, space_id: spaceId, parent_id: parent, parent_table: 'block', alive: true, properties: { title: [[`${type} ${bid.slice(-3)}`]] }, ...(content ? { content } : {}) } });
    const parentOps = [set(toggle, pageId, 'toggle', kids), { pointer: { table: 'block', id: pageId, spaceId }, path: ['content'], command: 'listAfter', args: { id: toggle } }];
    const childOps = kids.map((k) => set(k, toggle, 'text'));
    const before = snapshotsByType();
    const calls0 = stat.calls;
    stat.on = true;
    db.withRequestCache(() => records.applyTransactions(pat.id, [{ id: id(), spaceId, operations: (order === 'parent-first' ? [...parentOps, ...childOps] : [...childOps, ...parentOps]) as any }]));
    stat.on = false;
    return { 순서: order, 새스냅숏: diff(snapshotsByType(), before), DB호출: stat.calls - calls0 };
  };

  it('부모를 먼저 쓰면 쪽 단위, 자식을 먼저 쓰면 블록마다 스냅숏이 생긴다', async () => {
    const a = await scenario('SnapParentFirst', 'parent-first');
    const b = await scenario('SnapChildFirst', 'child-first');
    const line = JSON.stringify({ 스냅숏재현: [a, b] });
    console.log(line);
    if (process.env.IMPORT_PERF_OUT) appendFileSync(process.env.IMPORT_PERF_OUT, `${line}\n`);
    expect(Object.keys(a.새스냅숏).length + Object.keys(b.새스냅숏).length).toBeGreaterThan(0);
  }, 60_000);
});
