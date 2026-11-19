// 저장 계층 (AI 업무 워크스페이스, 2026-10-24 이식).
// 원본 litpage는 node:sqlite(DatabaseSync)였다. 원본 서버 코드를 그대로 쓰려고 같은 동기 API(prepare().get/all/run,
// exec)를 공용 Supabase Postgres의 전용 스키마 `aww` 위에 제공한다. SQL은 pg/translate.ts가 SQLite 문법에서 바꾸고,
// 실행은 pg/bridge.ts(작업 스레드 + Atomics.wait)가 동기로 처리한다. 레코드는 (tbl, id) 키의 JSON 문자열 행이다.
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BaseRecord, Table } from '#shared/records.ts';
import { PgError, execSync as bridgeExec, querySync as bridgeQuery } from './pg/bridge.ts';
import { translateBatch, translateQuery } from './pg/translate.ts';

/** 원본이 업로드 파일을 두던 폴더. 이식판은 파일을 Supabase Storage에 두므로 임시 작업 폴더로만 쓴다. */
export const DATA_DIR = process.env.NC_DATA_DIR ?? join(tmpdir(), 'ai-work-workspace');
mkdirSync(join(DATA_DIR, 'files'), { recursive: true });

type Param = string | number | null | Buffer | Uint8Array;

function normalize(params: unknown[]): Param[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'bigint') return Number(p);
    return p as Param;
  });
}

// ---------------------------------------------------------------- 요청 단위 레코드 캐시
// 권한 판정이 같은 레코드(부모 페이지·워크스페이스)를 한 요청 안에서 여러 번 읽으므로 DB 왕복을 줄인다.
// 요청이 끝나면 버린다(다른 서버 인스턴스와 값이 어긋나지 않게 요청 밖에서는 캐시하지 않음).
const requestCache = new AsyncLocalStorage<Map<string, BaseRecord | null>>();

export function withRequestCache<T>(fn: () => T): T {
  return requestCache.run(new Map(), fn);
}

/** AIMaster U12: 요청 캐시 밖에서 실행(오래 걸리는 백그라운드 에이전트 실행이 요청 때 읽어 둔 옛 값을 쓰지 않게) */
export function withoutRequestCache<T>(fn: () => T): T {
  return requestCache.exit(fn);
}

function cacheGet(key: string): BaseRecord | null | undefined {
  return requestCache.getStore()?.get(key);
}

function cacheSet(key: string, value: BaseRecord | null) {
  requestCache.getStore()?.set(key, value);
}

function cacheClear() {
  requestCache.getStore()?.clear();
}

// ---------------------------------------------------------------- 시작 경계 (2026-11-19 WS-20261119-REL)
// 모듈을 불러오는 것만으로는 DB에 가지 않는다 — `next build`의 경로 평가가 운영 DB에 닿지 않게 하기 위해서다.
// DB를 아직 쓰지 않은 동안의 db.exec(표 확인 DDL)과 atStartup(시작 작업)은 대기 목록에 쌓였다가, DB를 실제로 처음 쓰는
// 순간(첫 질의 직전) 불러온 순서 그대로 실행된다. 한 번 시작된 뒤에는 예전과 똑같다 — db.exec는 그 자리에서 바로 실행되고
// (잠금을 잡은 트랜잭션 안에서 표를 만드는 코드가 그 순서에 기대므로), 늦게 불려온 모듈의 시작 작업도 등록하는 자리에서 실행된다.
// 실패 처리(자동 재시도 없음):
//  - 필수 DDL이 던지면 그 질의가 오류를 받고, 이 인스턴스의 이후 질의도 같은 오류를 받는다(표가 없는 채로 진행하지 않는 안전 실패).
//  - 시작 작업은 한 건씩 격리한다: 던져도 그 질의·다른 시작 작업·이후 질의는 계속되고, 실패한 작업은 다시 돌리지 않는다.
//    기록에는 코드에 적어 둔 작업 이름과 고정 분류('db'·'error')만 남긴다(오류 객체의 속성은 읽지도 남기지도 않음).
const pendingDdl: string[] = [];
const startupTasks: { name: string; run: () => void }[] = [];
let started = false;
let starting = false;
let startFailure: { error: unknown } | null = null;

function flushPendingDdl() {
  while (pendingDdl.length) {
    bridgeExec(pendingDdl[0]);
    pendingDdl.shift();
  }
}

/**
 * 기록에 남기는 오류 분류 — 정해 둔 두 낱말뿐이다('db': DB 브리지가 낸 오류, 'error': 그 밖).
 * 오류 객체의 속성(code·name·message 등)은 읽지도 기록하지도 않는다: 읽는 것만으로 던지는 객체가 있을 수 있고,
 * 값에 저장 자료가 섞여 있을 수 있다. 판정 자체가 던져도(프록시 등) 'error'로 떨어진다.
 */
export function errorKind(e: unknown): 'db' | 'error' {
  try {
    return e instanceof PgError ? 'db' : 'error';
  } catch {
    return 'error';
  }
}

function runStartupTask(task: { name: string; run: () => void }) {
  try {
    task.run();
  } catch (e) {
    console.error(`[startup] ${task.name} failed`, errorKind(e));
  }
}

function ensureStarted() {
  if (startFailure) throw startFailure.error;
  if (started || starting) return; // 이미 시작됐거나, 시작 작업 안에서 나온 질의(재진입)
  starting = true;
  try {
    try {
      flushPendingDdl();
    } catch (error) {
      startFailure = { error }; // 필수 DDL 실패만 남긴다
      throw error;
    }
    started = true; // 이 뒤로 db.exec는 바로 실행된다(시작 작업 안의 DDL 포함)
    // 시작 작업이 다른 시작 작업을 등록할 수 있으므로 길이를 매번 다시 본다
    for (let i = 0; i < startupTasks.length; i++) runStartupTask(startupTasks[i]);
    startupTasks.length = 0;
  } finally {
    starting = false;
  }
}

/**
 * 예전에 모듈 최상위에서 바로 하던 DB 작업(주기 작업 예약·자료 이관 등)을 등록한다.
 * 아직 DB를 쓰기 전이면 첫 질의 직전에(표 확인 DDL 다음, 등록한 순서대로) 실행되고, 이미 시작된 뒤면 지금 바로 실행된다.
 * 어느 쪽이든 실패는 그 작업에서 끝난다(이름과 오류 종류만 기록).
 */
export function atStartup(run: () => void, name = 'task'): void {
  if (started && !starting) runStartupTask({ name, run });
  else startupTasks.push({ name, run });
}

function querySync(text: string, params: unknown[] = []) {
  ensureStarted();
  return bridgeQuery(text, params);
}

function execSync(text: string): void {
  ensureStarted();
  bridgeExec(text);
}

// ---------------------------------------------------------------- node:sqlite와 같은 모양의 문장 객체
const WRITES_RECORDS = /^\s*(UPDATE|DELETE|INSERT)\b[\s\S]*\brecords\b/i;

class Statement {
  readonly text: string;
  private touchesRecords: boolean;
  constructor(sql: string) {
    this.text = translateQuery(sql);
    this.touchesRecords = WRITES_RECORDS.test(this.text);
  }
  get(...params: unknown[]): any {
    if (!this.text) return undefined;
    return querySync(this.text, normalize(params)).rows[0];
  }
  all(...params: unknown[]): any[] {
    if (!this.text) return [];
    return querySync(this.text, normalize(params)).rows;
  }
  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    if (!this.text) return { changes: 0, lastInsertRowid: 0 };
    if (this.touchesRecords) cacheClear();
    const r = querySync(this.text, normalize(params));
    return { changes: r.count, lastInsertRowid: 0 };
  }
}

export const db = {
  prepare(sql: string): Statement {
    return new Statement(sql);
  },
  exec(sql: string): void {
    const parts = translateBatch(sql);
    if (!parts.length) return;
    if (parts.some((p) => WRITES_RECORDS.test(p))) cacheClear();
    // DB를 아직 쓰기 전(모듈을 불러오는 중)이면 대기 — 첫 질의 직전에 순서대로 나간다. 시작된 뒤에는 예전처럼 바로 실행
    if (started) execSync(parts.join(';\n'));
    else pendingDdl.push(parts.join(';\n'));
  },
};

db.exec(`
CREATE TABLE IF NOT EXISTS records (
  tbl TEXT NOT NULL,
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  space_id TEXT,
  parent_id TEXT,
  parent_table TEXT,
  alive INTEGER,
  last_edited_time INTEGER,
  data TEXT NOT NULL,
  PRIMARY KEY (tbl, id)
);
CREATE INDEX IF NOT EXISTS idx_records_parent ON records(tbl, parent_id);
CREATE INDEX IF NOT EXISTS idx_records_space ON records(tbl, space_id, last_edited_time);

CREATE TABLE IF NOT EXISTS changes (
  lsn INTEGER PRIMARY KEY AUTOINCREMENT,
  tbl TEXT NOT NULL,
  id TEXT NOT NULL,
  space_id TEXT,
  version INTEGER NOT NULL,
  time INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_changes_space ON changes(space_id, lsn);

-- 원본 자체 로그인 표: 운영은 AIMaster 로그인을 쓰므로 비어 있다(원본 시험·auth.ts 호환용으로만 유지)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_time INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS passwords (
  user_id TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  salt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  space_id TEXT,
  user_id TEXT,
  name TEXT,
  mime TEXT,
  size INTEGER,
  path TEXT,
  created_time INTEGER
);

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  space_id TEXT,
  created_time INTEGER NOT NULL,
  author_ids TEXT,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_page ON snapshots(page_id, created_time);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  space_id TEXT,
  page_id TEXT,
  block_id TEXT,
  user_id TEXT,
  type TEXT,
  created_time INTEGER,
  data TEXT
);
CREATE INDEX IF NOT EXISTS idx_activity_page ON activity(page_id, created_time);
CREATE INDEX IF NOT EXISTS idx_activity_space ON activity(space_id, created_time);

-- transaction ids already applied (client retries after a lost response must not re-apply text splices)
CREATE TABLE IF NOT EXISTS applied_tx (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL
);

-- 전문 검색: 원본 FTS5 trigram 대신 pg_trgm GIN 색인(한국어 부분 검색 포함)
CREATE TABLE IF NOT EXISTS search_index (
  block_id TEXT NOT NULL,
  page_id TEXT,
  space_id TEXT,
  kind TEXT,
  text TEXT
);
CREATE INDEX IF NOT EXISTS idx_search_block ON search_index(block_id);
CREATE INDEX IF NOT EXISTS idx_search_space ON search_index(space_id);
CREATE INDEX IF NOT EXISTS idx_search_text_trgm ON search_index USING gin (text gin_trgm_ops);
`);

const stmt = {
  get: db.prepare('SELECT data FROM records WHERE tbl = ? AND id = ?'),
  many: 'SELECT id, data FROM records WHERE tbl = $1 AND id = ANY($2::text[])',
  put: db.prepare(`INSERT INTO records (tbl, id, version, space_id, parent_id, parent_table, alive, last_edited_time, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tbl, id) DO UPDATE SET version=excluded.version, space_id=excluded.space_id, parent_id=excluded.parent_id,
      parent_table=excluded.parent_table, alive=excluded.alive, last_edited_time=excluded.last_edited_time, data=excluded.data`),
  change: 'INSERT INTO changes (tbl, id, space_id, version, time) VALUES ($1, $2, $3, $4, $5) RETURNING lsn',
  children: db.prepare('SELECT data FROM records WHERE tbl = ? AND parent_id = ?'),
  bySpace: db.prepare('SELECT data FROM records WHERE tbl = ? AND space_id = ?'),
};

export function getRecord<T extends BaseRecord = BaseRecord>(table: Table, id: string): T | undefined {
  if (typeof id !== 'string' || !id) return undefined;
  const key = `${table}:${id}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return (hit ?? undefined) as T | undefined;
  const row = stmt.get.get(table, id) as { data: string } | undefined;
  const value = row ? (JSON.parse(row.data) as T) : undefined;
  cacheSet(key, value ?? null);
  return value;
}

export function getRecords<T extends BaseRecord = BaseRecord>(table: Table, ids: string[]): T[] {
  const missing = ids.filter((id) => typeof id === 'string' && id && cacheGet(`${table}:${id}`) === undefined);
  if (missing.length > 1) {
    const found = new Map<string, BaseRecord>();
    for (const r of querySync(stmt.many, [table, [...new Set(missing)]]).rows as { id: string; data: string }[]) {
      found.set(r.id, JSON.parse(r.data));
    }
    for (const id of missing) cacheSet(`${table}:${id}`, found.get(id) ?? null);
    // 캐시가 없는 경우(요청 밖)에는 위에서 읽은 값으로 바로 돌려준다
    if (!requestCache.getStore()) return ids.map((id) => found.get(id)).filter(Boolean) as T[];
  }
  const out: T[] = [];
  for (const id of ids) {
    const r = getRecord<T>(table, id);
    if (r) out.push(r);
  }
  return out;
}

/** Persist a full record value (version must already be bumped by caller). Returns the change lsn. */
export function putRecord(table: Table, value: BaseRecord): number {
  const v = value as any;
  // 2026-11-19(WS-20261119-03 A): 이 문장은 (tbl, id) 한 줄만 바꾸고 바로 아래에서 그 키를 새 값으로 넣으므로, 요청 캐시를
  // 통째로 비우지 않는다(Statement.run을 거치면 쓰기마다 전체가 비워져, 문서 많은 가져오기에서 같은 부모·컬렉션을 블록마다
  // 다시 읽었다 — 전체 DB 호출의 약 45%). records 표에는 다른 줄을 바꾸는 트리거가 없다.
  // 일반 SQL로 records를 쓰는 문장(Statement.run·db.exec), 트랜잭션 되돌리기, lockRecords의 캐시 비움은 그대로다.
  querySync(stmt.put.text, normalize([
    table, v.id, v.version ?? 0, v.space_id ?? (table === 'space' ? v.id : null), v.parent_id ?? null, v.parent_table ?? null,
    v.alive === false ? 0 : 1, v.last_edited_time ?? Date.now(), JSON.stringify(value),
  ]));
  cacheSet(`${table}:${v.id}`, JSON.parse(JSON.stringify(value)));
  const res = querySync(stmt.change, [table, v.id, v.space_id ?? (table === 'space' ? v.id : null), v.version ?? 0, Date.now()]);
  return Number(res.rows[0]?.lsn ?? 0);
}

export function childrenOf<T extends BaseRecord = BaseRecord>(table: Table, parentId: string): T[] {
  return (stmt.children.all(table, parentId) as { data: string }[]).map((r) => JSON.parse(r.data) as T);
}

export function recordsInSpace<T extends BaseRecord = BaseRecord>(table: Table, spaceId: string): T[] {
  return (stmt.bySpace.all(table, spaceId) as { data: string }[]).map((r) => JSON.parse(r.data) as T);
}

let txDepth = 0;
export function tx<T>(fn: () => T): T {
  // 원본은 중첩 트랜잭션을 쓰지 않지만, 안쪽 호출은 바깥 트랜잭션에 합친다
  if (txDepth > 0) return fn();
  execSync('BEGIN');
  txDepth++;
  try {
    const out = fn();
    txDepth--;
    execSync('COMMIT');
    return out;
  } catch (e) {
    txDepth--;
    try {
      execSync('ROLLBACK');
    } finally {
      // 되돌린 값이 캐시에 남지 않게 비운다
      cacheClear();
    }
    throw e;
  }
}

export function currentLsn(): number {
  const row = db.prepare('SELECT MAX(lsn) AS lsn FROM changes').get() as { lsn: number | null };
  return row.lsn ?? 0;
}

export function changesSince(spaceIds: string[], lsn: number, limit = 5000): { lsn: number; tbl: Table; id: string; version: number }[] {
  if (!spaceIds.length) return [];
  const q = db.prepare(`SELECT lsn, tbl, id, version FROM changes WHERE lsn > ? AND space_id IN (${spaceIds.map(() => '?').join(',')}) ORDER BY lsn LIMIT ?`);
  return q.all(lsn, ...spaceIds, limit) as any;
}

export function findUserIdByEmail(email: string): string | null {
  const row = db.prepare("SELECT id FROM records WHERE tbl = 'lit_user' AND json_extract(data, '$.email') = ?").get(email.toLowerCase()) as { id: string } | undefined;
  if (row) return row.id;
  // secondary emails (Settings › Account › Manage emails; table created by api/modules/account.ts) log in to the same account
  try {
    return (db.prepare('SELECT user_id FROM user_emails WHERE email = ?').get(email.toLowerCase()) as { user_id: string } | undefined)?.user_id ?? null;
  } catch {
    return null;
  }
}

/** 이식판 U13(2026-11-11): 여러 사람이 동시에 같은 레코드를 고칠 때 변경이 사라지지 않게, 트랜잭션 안에서 고칠 줄을 잠그고
 *  (정렬 순서로 — 교착 방지) 요청 캐시를 비워 잠근 뒤의 최신 값으로 적용한다. 서버 인스턴스가 여럿인 Vercel에서 필요. */
export function lockRecords(pointers: { table?: unknown; id?: unknown }[]) {
  if (txDepth === 0) return;
  const keys = [...new Set(pointers.filter((p) => typeof p?.table === 'string' && typeof p?.id === 'string').map((p) => `${p.table}\u0000${p.id}`))].sort().slice(0, 2000);
  if (!keys.length) return;
  const q = db.prepare('SELECT id FROM records WHERE tbl = ? AND id = ? FOR UPDATE');
  for (const k of keys) {
    const [table, id] = k.split('\u0000');
    q.all(table, id);
  }
  cacheClear();
}
