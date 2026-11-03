// U4: AI 채팅 기록 30일 자동 삭제 — 31일 전 대화·메시지·되돌리기 기록·실행 기록·수식 평가는 지우고,
// 29일 전 기록과 회원 페이지(records), 30일 자동 삭제 예외 회원 기록은 남는지 확인한다. 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let db: typeof import('../../src/litpage/server/db.ts');
let retention: typeof import('../../src/server/aiRetention.ts');

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 24);
const OLD = NOW - 31 * DAY;
const RECENT = NOW - 29 * DAY;

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  retention = await import('../../src/server/aiRetention.ts');
  const thread = (id: string, t: number) => db.db.prepare('INSERT INTO ai_threads (id, user_id, space_id, title, created_time, updated_time) VALUES (?, ?, ?, ?, ?, ?)').run(id, 'u1', 's1', id, t, NOW);
  const message = (id: string, threadId: string, t: number) => db.db.prepare('INSERT INTO ai_messages (id, thread_id, seq, role, created_time, data) VALUES (?, ?, ?, ?, ?, ?)').run(id, threadId, 1, 'user', t, '{}');
  const change = (id: string, threadId: string | null, t: number) => db.db.prepare('INSERT INTO ai_changes (id, turn_id, thread_id, user_id, space_id, tool, created_time, ops, inverse, pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, 'turn', threadId, 'u1', 's1', 'create_page', t, '[]', '[]', '[]');
  thread('t-old', OLD);
  thread('t-new', RECENT);
  message('m-old', 't-old', OLD);
  message('m-old-late', 't-old', RECENT); // 오래된 대화의 최근 메시지도 대화와 함께 지워짐
  message('m-new', 't-new', RECENT);
  change('c-old', 't-old', OLD);
  change('c-orphan-old', null, OLD);
  change('c-new', 't-new', RECENT);
  db.db.prepare('INSERT INTO agent_runs (id, agent_id, space_id, kind, status, created_time) VALUES (?, ?, ?, ?, ?, ?)').run('r-old', 'a1', 's1', 'chat', 'done', OLD);
  db.db.prepare('INSERT INTO agent_runs (id, agent_id, space_id, kind, status, created_time) VALUES (?, ?, ?, ?, ?, ?)').run('r-new', 'a1', 's1', 'chat', 'done', RECENT);
  db.db.prepare('INSERT INTO ai_formula_feedback (id, user_id, time, rating) VALUES (?, ?, ?, ?)').run('f-old', 'u1', OLD, 'good');
  db.db.prepare('INSERT INTO ai_formula_feedback (id, user_id, time, rating) VALUES (?, ?, ?, ?)').run('f-new', 'u1', RECENT, 'good');
  // 30일 자동 삭제 예외 회원(관리자·시험 계정)의 오래된 기록 — 남아야 한다
  db.db.prepare('INSERT INTO ai_threads (id, user_id, space_id, title, created_time, updated_time) VALUES (?, ?, ?, ?, ?, ?)').run('t-vip', 'vip', 's2', 't-vip', OLD, NOW);
  message('m-vip', 't-vip', OLD);
  db.db.prepare('INSERT INTO ai_changes (id, turn_id, thread_id, user_id, space_id, tool, created_time, ops, inverse, pages) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('c-vip', 'turn', null, 'vip', 's2', 'create_page', OLD, '[]', '[]', '[]');
  db.db.prepare('INSERT INTO agent_runs (id, agent_id, space_id, kind, actor_id, status, created_time) VALUES (?, ?, ?, ?, ?, ?, ?)').run('r-vip', 'a2', 's2', 'chat', 'vip', 'done', OLD);
  db.db.prepare('INSERT INTO ai_formula_feedback (id, user_id, time, rating) VALUES (?, ?, ?, ?)').run('f-vip', 'vip', OLD, 'good');
  // AI가 만들어 준 오래된 회원 페이지 — 회원 업무 자료라 남아야 한다
  db.db.prepare('INSERT INTO records (tbl, id, version, space_id, alive, last_edited_time, data) VALUES (?, ?, ?, ?, ?, ?, ?)').run('block', 'page-by-ai', 1, 's1', 1, OLD, JSON.stringify({ id: 'page-by-ai', type: 'page', space_id: 's1' }));
});

const ids = (table: string) => (db.db.prepare(`SELECT id FROM ${table} ORDER BY id`).all() as { id: string }[]).map((r) => r.id);

describe('AI 채팅 기록 30일 자동 삭제(U4)', () => {
  const EXEMPT = new Set(['vip']);

  it('30일 지난 기록만 지우고 회원 페이지·예외 회원 기록은 남긴다', () => {
    const r = retention.runAiRetention(NOW, 2_000, EXEMPT);
    expect(r).toEqual({ threads: 1, messages: 2, changes: 2, runs: 1, feedback: 1 });
    expect(ids('ai_threads')).toEqual(['t-new', 't-vip']);
    expect(ids('ai_messages')).toEqual(['m-new', 'm-vip']);
    expect(ids('ai_changes')).toEqual(['c-new', 'c-vip']);
    expect(ids('agent_runs')).toEqual(['r-new', 'r-vip']);
    expect(ids('ai_formula_feedback')).toEqual(['f-new', 'f-vip']);
    expect(db.getRecord<any>('block', 'page-by-ai')?.type).toBe('page');
  });

  it('다시 돌려도 더 지울 것이 없다', () => {
    expect(retention.runAiRetention(NOW, 2_000, EXEMPT)).toEqual({ threads: 0, messages: 0, changes: 0, runs: 0, feedback: 0 });
  });

  it('예외 목록에서 빠지면 그 회원 기록도 지운다', () => {
    expect(retention.runAiRetention(NOW)).toEqual({ threads: 1, messages: 1, changes: 1, runs: 1, feedback: 1 });
  });
});
