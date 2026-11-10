// U11 자동화(2026-11-10) — 플랜 docs/PLAN_20261110_U11_AUTOMATION.md §5 시험.
// 1. 자동화 저장이 열리고, 웹훅 동작이 든 자동화는 거절된다(에이전트 동작은 U12에서 열림 — agentU12.test.ts).
// 2. 회원 정시 작업은 주인 회원의 실행에서만 돌고(다른 회원 일 처리 금지), 운영 정리 작업은 회원 작업을 건너뛴다.
// 3. 명령 처리 중 회원 정시 작업이 예약되면 표시된다(→ 회원 cron-job.org 켜기).
// 4. 자동화 실행 기록·알림 30일 자동 삭제(예외 회원 제외). 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';
import { stageBlock, stageBodyBlock } from '@/server/stagePolicy';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let db: typeof import('../../src/litpage/server/db.ts');
let scheduler: typeof import('../../src/litpage/server/scheduler.ts');
let jobs: typeof import('../../src/server/memberJobs.ts');

const DAY = 86_400_000;

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  scheduler = await import('../../src/litpage/server/scheduler.ts');
  jobs = await import('../../src/server/memberJobs.ts');
});

describe('U11 자동화 열기', () => {
  it('자동화 저장·켜기·삭제·복제·버튼 서버 동작이 열려 있다', () => {
    for (const name of ['saveAutomation', 'setAutomationStatus', 'deleteAutomation', 'duplicateAutomation', 'runButtonServerSteps']) expect(stageBlock(name)).toBeNull();
  });
  it('에이전트 공유·개발자 API·MCP는 계속 닫혀 있다(U12에서 에이전트 자체는 열림)', () => {
    for (const name of ['getAgentSharing', 'devCreateToken', 'mcpConnect']) expect(stageBlock(name)).not.toBeNull();
  });
  it('웹훅 동작이 든 자동화 저장은 한국어 안내와 함께 거절된다(에이전트 동작은 U12에서 열림)', () => {
    for (const type of ['webhook']) {
      const r = stageBodyBlock('saveAutomation', { collectionId: 'c', automation: { actions: [{ id: 'a', type: 'notify' }, { id: 'b', type }] } });
      expect(r?.status).toBe(403);
      expect(r?.message).toContain('준비 중');
    }
  });
  it('알림·속성 바꾸기 동작 자동화 저장은 통과한다', () => {
    expect(stageBodyBlock('saveAutomation', { automation: { actions: [{ type: 'notify' }, { type: 'edit_property' }] } })).toBeNull();
    expect(stageBodyBlock('applyChanges', { automation: { actions: [{ type: 'webhook' }] } })).toBeNull();
  });
});

describe('U11 회원 정시 작업 나누기', () => {
  it('반복 자동화는 만든 회원, 리마인더는 ownerId 회원의 실행에서만 돈다', async () => {
    const now = Date.now();
    db.putRecord('automation', { id: 'auto-u1', version: 0, space_id: 's1', parent_id: 'c1', parent_table: 'collection', alive: true, created_by_id: 'u1' } as never);
    const ran: string[] = [];
    scheduler.registerJobHandler('automation.recurrence', (p) => { ran.push(`auto:${p.id}`); });
    scheduler.registerJobHandler('reminder', (p) => { ran.push(`rem:${p.ownerId}`); });
    scheduler.registerJobHandler('test.system', () => { ran.push('system'); });
    scheduler.scheduleJob('automation.recurrence', 'automation:auto-u1', now - 1000, { id: 'auto-u1' });
    scheduler.scheduleJob('reminder', 'reminder:b2:x', now - 1000, { blockId: 'b2', key: 'reminder:b2:x', ownerId: 'u2', fireAt: now - 1000 });
    scheduler.scheduleJob('test.system', 'test-system', now - 1000, null);

    expect(jobs.countMemberJobs('u1')).toBe(1);
    expect(jobs.countMemberJobs('u2')).toBe(1);
    expect(jobs.countMemberJobs('u3')).toBe(0);

    // 회원 u2의 실행 주소: u2 리마인더만 — u1 자동화·운영 작업은 그대로 남음
    await scheduler.runDueJobs(now, 200, jobs.memberJobFilter('u2'));
    expect(ran).toEqual(['rem:u2']);
    expect(scheduler.getJob('automation:auto-u1')).not.toBeNull();
    expect(scheduler.getJob('test-system')).not.toBeNull();

    // 운영 정리 작업: 회원 작업(u1 자동화)은 건너뛰고 운영 작업만
    await scheduler.runDueJobs(now, 200, jobs.operatorJobFilter);
    expect(ran).toEqual(['rem:u2', 'system']);
    expect(scheduler.getJob('automation:auto-u1')).not.toBeNull();

    await scheduler.runDueJobs(now, 200, jobs.memberJobFilter('u1'));
    expect(ran).toEqual(['rem:u2', 'system', 'auto:auto-u1']);
    expect(jobs.countMemberJobs('u1')).toBe(0);
  });

  it('지워진 자동화의 작업은 어느 회원 실행에서도 돌지 않는다', () => {
    db.putRecord('automation', { id: 'auto-dead', version: 1, space_id: 's1', parent_id: 'c1', parent_table: 'collection', alive: false, created_by_id: 'u1' } as never);
    expect(jobs.jobOwner({ kind: 'automation.recurrence', payload: { id: 'auto-dead' } })).toBeNull();
    expect(jobs.jobOwner({ kind: 'reminder', payload: {} })).toBeNull();
  });

  it('명령 처리 중 회원 정시 작업이 예약되면 표시되고, 운영 작업만 예약되면 표시되지 않는다', async () => {
    const a = await jobs.trackMemberJobs(async () => { scheduler.scheduleJob('reminder', 'reminder:b9:y', Date.now() + DAY, { ownerId: 'u9' }); return 1; });
    expect(a).toEqual({ result: 1, scheduled: true });
    const b = await jobs.trackMemberJobs(async () => { scheduler.scheduleJob('test.system', 'test-system-2', Date.now() + DAY, null); return 2; });
    expect(b).toEqual({ result: 2, scheduled: false });
    scheduler.cancelJob('reminder:b9:y');
    scheduler.cancelJob('test-system-2');
  });
});

describe('U11 자동화 실행 기록·알림 30일 자동 삭제', () => {
  it('31일 전 기록·알림은 지우고, 29일 전과 예외 회원 것은 남긴다', async () => {
    const { runAutomationRetention } = await import('../../src/server/automationRetention.ts');
    const NOW = Date.UTC(2026, 10, 10);
    const OLD = NOW - 31 * DAY;
    const RECENT = NOW - 29 * DAY;
    db.putRecord('automation', { id: 'auto-r1', version: 0, space_id: 's1', parent_id: 'c1', parent_table: 'collection', alive: true, created_by_id: 'u1' } as never);
    db.putRecord('automation', { id: 'auto-vip', version: 0, space_id: 's2', parent_id: 'c2', parent_table: 'collection', alive: true, created_by_id: 'vip' } as never);
    const run = (id: string, automationId: string, t: number) => db.db.prepare('INSERT INTO automation_runs (id, automation_id, time, status) VALUES (?, ?, ?, ?)').run(id, automationId, t, 'success');
    run('run-old', 'auto-r1', OLD);
    run('run-new', 'auto-r1', RECENT);
    run('run-vip', 'auto-vip', OLD);
    run('run-orphan', 'auto-gone', OLD);
    const note = (id: string, userId: string, t: number) => db.putRecord('notification', { id, version: 0, user_id: userId, space_id: 's1', type: 'automation', created_time: t, read: false, archived: false } as never);
    note('n-old', 'u1', OLD);
    note('n-new', 'u1', RECENT);
    note('n-vip', 'vip', OLD);

    const r = runAutomationRetention(NOW, 5_000, new Set(['vip']));
    expect(r).toEqual({ runs: 2, notifications: 1 });
    const left = (db.db.prepare('SELECT id FROM automation_runs ORDER BY id').all() as { id: string }[]).map((x) => x.id);
    expect(left).toEqual(['run-new', 'run-vip']);
    expect(db.getRecord('notification', 'n-old')).toBeFalsy();
    expect(db.getRecord('notification', 'n-new')).toBeTruthy();
    expect(db.getRecord('notification', 'n-vip')).toBeTruthy();
    // 자동화 설정 자체는 남는다
    expect(db.getRecord('automation', 'auto-r1')).toBeTruthy();
  });
});
