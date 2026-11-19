// 트랜잭션 깊이 — WS-20261119-03, Master msg_e62063905385 (Mac 검수 msg_80ea9fa320d8).
// 예전 tx()는 COMMIT이 실패하면 깊이를 두 번 내려 음수로 만들었다. 그 뒤의 트랜잭션은 깊이가 0으로 보여
// 잠금(lockRecords)을 건너뛰고, 겹친 트랜잭션이 BEGIN/COMMIT을 따로 보내고, 되돌리기 알림(onTxRollback) 등록이 무시됐다
// (버전 기록의 대기 작성자가 되돌려진 쓰기에서 새어 나감).
// 여기서는 DB 다리를 감싸 COMMIT·ROLLBACK 실패를 주입하고, 그 뒤의 트랜잭션이 정상인지 고정한다. 다시 시도하지 않는 것도 고정한다.
// 로컬 전용 fixture만 쓴다(AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL).
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

const sent: string[] = [];
const fail = { commit: 0, rollback: 0 }; // 남은 실패 횟수
vi.mock('../../src/litpage/server/pg/bridge.ts', async (orig) => {
  const real = (await orig()) as Record<string, any>;
  return {
    ...real,
    querySync: (text: string, params?: unknown[]) => { sent.push(text.replace(/\s+/g, ' ').trim()); return real.querySync(text, params); },
    execSync: (text: string) => {
      sent.push(text);
      if (text === 'COMMIT' && fail.commit > 0) {
        fail.commit--;
        // 서버가 커밋을 받지 못한 경우: 문장을 보내지 않고 실패시킨다(연결의 트랜잭션은 열린 채 → 뒤따르는 ROLLBACK이 닫는다)
        throw new Error('COMMIT 실패 주입');
      }
      if (text === 'ROLLBACK' && fail.rollback > 0) {
        fail.rollback--;
        real.execSync(text); // 실제로는 되돌리고, 응답만 실패한 것처럼
        throw new Error('ROLLBACK 실패 주입');
      }
      return real.execSync(text);
    },
  };
});

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let d: typeof import('../../src/litpage/server/db.ts');
let records: typeof import('../../src/litpage/server/records.ts');

const ann = { id: '22222222-2222-4222-8222-222222222222', email: 'tx-ann@example.com', name: '앤' };
const bob = { id: '11111111-1111-4111-8111-111111111111', email: 'tx-bob@example.com', name: '밥' };
let spaceId = '';
let n = 0;
const uid = () => `00000000-0000-4000-b000-${String(++n).padStart(12, '0')}`;
const failPersist = { on: false };

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  d = await import('../../src/litpage/server/db.ts');
  records = await import('../../src/litpage/server/records.ts');
  for (const m of [ann, bob]) await runtime.runRpc('loadAccountData', {}, m);
  const r = await runtime.runRpc('createWorkspace', { name: '깊이' }, ann);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
  records.onBeforePersist(() => { if (failPersist.on) throw new Error('저장 실패 주입'); });
});

beforeEach(() => {
  fail.commit = 0;
  fail.rollback = 0;
  failPersist.on = false;
  sent.length = 0;
});

const count = (stmt: string) => sent.filter((s) => s === stmt).length;
const locks = () => sent.filter((s) => /FOR UPDATE$/.test(s)).length;
const rec = (id: string, title: string, version = 1) => ({ id, version, type: 'text', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, properties: { title: [[title]] } }) as any;
const stored = (id: string) => d.withoutRequestCache(() => d.getRecord('block', id)) as any;
const titleOf = (r: any) => r?.properties?.title?.[0]?.[0];
/** COMMIT 실패를 한 번 일으킨다(깊이가 어긋났던 바로 그 경로) */
function breakCommitOnce() {
  const id = uid();
  fail.commit = 1;
  expect(() => d.tx(() => d.putRecord('block', rec(id, '커밋되지 못할 값')))).toThrow('COMMIT 실패 주입');
  sent.length = 0;
  return id;
}

describe('트랜잭션 깊이', () => {
  it('COMMIT이 실패하면 원래 오류가 그대로 나가고, 한 번만 시도하며, 되돌린다', () => {
    const id = uid();
    let runs = 0;
    const undone: string[] = [];
    fail.commit = 1;
    expect(() => d.withRequestCache(() => d.tx(() => {
      runs++;
      d.putRecord('block', rec(id, '커밋되지 못할 값'));
      d.onTxRollback(() => undone.push('알림'));
    }))).toThrow('COMMIT 실패 주입');
    expect(runs).toBe(1); // 본문을 다시 실행하지 않는다
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 1, ROLLBACK: 1 });
    expect(undone).toEqual(['알림']); // 되돌리기 알림도 한 번
    expect(stored(id)).toBeUndefined();
  });

  it('COMMIT 실패 뒤의 정상 트랜잭션: BEGIN·COMMIT 한 번씩, 잠금을 건다', () => {
    const a = uid();
    d.putRecord('block', rec(a, 'A'));
    breakCommitOnce();
    d.withRequestCache(() => d.tx(() => {
      d.lockRecords([{ table: 'block', id: a }]);
      d.putRecord('block', rec(a, 'A2', 2));
    }));
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 1, ROLLBACK: 0 });
    expect(locks()).toBe(1); // 깊이가 어긋나 있으면 잠금을 건너뛴다(0)
    expect(titleOf(stored(a))).toBe('A2');
  });

  it('COMMIT 실패 뒤의 겹친 트랜잭션: 안쪽은 바깥에 합쳐진다(BEGIN·COMMIT 한 번씩)', () => {
    const [a, b] = [uid(), uid()];
    breakCommitOnce();
    d.tx(() => {
      d.putRecord('block', rec(a, '바깥'));
      d.tx(() => {
        d.putRecord('block', rec(b, '안쪽'));
        d.tx(() => d.lockRecords([{ table: 'block', id: a }]));
      });
    });
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 1, ROLLBACK: 0 });
    expect(locks()).toBe(1);
    expect(titleOf(stored(a))).toBe('바깥');
    expect(titleOf(stored(b))).toBe('안쪽');
  });

  it('COMMIT 실패 뒤의 실패 트랜잭션: 되돌리기 알림이 불리고, 안쪽에서 쓴 값도 함께 되돌려진다', () => {
    const [a, b] = [uid(), uid()];
    breakCommitOnce();
    const undone: string[] = [];
    expect(() => d.tx(() => {
      d.putRecord('block', rec(a, '바깥'));
      d.onTxRollback(() => undone.push('바깥'));
      d.tx(() => {
        d.putRecord('block', rec(b, '안쪽'));
        d.onTxRollback(() => undone.push('안쪽'));
      });
      throw new Error('본문 실패');
    })).toThrow('본문 실패');
    expect(undone).toEqual(['안쪽', '바깥']); // 등록의 역순, 각각 한 번
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 0, ROLLBACK: 1 });
    expect(stored(a)).toBeUndefined();
    expect(stored(b)).toBeUndefined(); // 깊이가 어긋나 있으면 안쪽이 따로 커밋돼 남는다
  });

  it('COMMIT 실패 뒤: 되돌려진 쓰기의 작성자가 버전 기록에 새지 않는다', () => {
    const p = uid();
    d.putRecord('block', { id: p, version: 1, type: 'page', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, content: [], properties: { title: [['작성자 누출']] }, permissions: [{ type: 'user_permission', role: 'editor', user_id: ann.id }, { type: 'user_permission', role: 'editor', user_id: bob.id }] } as any);
    const add = (who: typeof ann, title: string) => {
      const id = uid();
      d.withRequestCache(() => records.applyTransactions(who.id, [{ id: uid(), spaceId, operations: [
        { pointer: { table: 'block', id, spaceId }, path: [], command: 'set', args: { id, type: 'text', space_id: spaceId, parent_id: p, parent_table: 'block', alive: true, properties: { title: [[title]] } } },
        { pointer: { table: 'block', id: p, spaceId }, path: ['content'], command: 'listAfter', args: { id } },
      ] as any }]));
    };
    const authors = () => (d.db.prepare('SELECT author_ids FROM snapshots WHERE page_id = ? ORDER BY created_time').all(p) as { author_ids: string }[]).map((r) => JSON.parse(r.author_ids));
    add(ann, '앤의 첫 줄'); // 첫 스냅숏(앤)
    breakCommitOnce();
    // 밥의 쓰기는 저장과 버전 기록 처리(대기 작성자에 밥 추가)까지 끝난 뒤, 그것을 감싼 바깥 트랜잭션에서 실패한다
    // (가져오기처럼 applyTransactions를 감싸는 경로). 되돌리기 알림이 무시되면 밥이 대기 작성자에 남는다.
    expect(() => d.tx(() => { add(bob, '되돌려질 밥의 줄'); throw new Error('바깥 실패'); })).toThrow('바깥 실패');
    // 저장 직전에 실패하는 경우(버전 기록 처리 전)도 마찬가지로 남지 않는다
    failPersist.on = true;
    expect(() => add(bob, '저장 전에 실패할 밥의 줄')).toThrow('저장 실패 주입');
    failPersist.on = false;
    d.db.prepare('UPDATE snapshots SET created_time = created_time - 660000 WHERE page_id = ?').run(p); // 11분 전으로
    add(ann, '간격 뒤 앤의 줄');
    expect(authors()).toEqual([[ann.id], [ann.id]]); // 밥이 없다
  });

  it('COMMIT 실패 때 등록돼 있던 되돌리기 알림은 그때 한 번만 불리고, 다음 트랜잭션으로 넘어가지 않는다', () => {
    const undone: string[] = [];
    fail.commit = 1;
    expect(() => d.tx(() => d.onTxRollback(() => undone.push('첫 번째')))).toThrow('COMMIT 실패 주입');
    expect(undone).toEqual(['첫 번째']);
    d.tx(() => d.putRecord('block', rec(uid(), '정상')));
    expect(() => d.tx(() => { throw new Error('본문 실패'); })).toThrow('본문 실패');
    expect(undone).toEqual(['첫 번째']);
  });

  it('성공한 트랜잭션의 되돌리기 알림은 버려진다(뒤의 실패 트랜잭션에서 불리지 않는다)', () => {
    const undone: string[] = [];
    d.tx(() => d.onTxRollback(() => undone.push('성공한 쪽')));
    expect(() => d.tx(() => { d.onTxRollback(() => undone.push('실패한 쪽')); throw new Error('본문 실패'); })).toThrow('본문 실패');
    expect(undone).toEqual(['실패한 쪽']);
  });

  it('트랜잭션 밖에서 등록한 되돌리기 알림은 무시된다', () => {
    const undone: string[] = [];
    d.onTxRollback(() => undone.push('밖'));
    expect(() => d.tx(() => { throw new Error('본문 실패'); })).toThrow('본문 실패');
    expect(undone).toEqual([]);
  });

  it('본문이 실패하면 원래 오류가 나가고 ROLLBACK 한 번, 그 뒤의 트랜잭션은 정상이다', () => {
    const [a, b] = [uid(), uid()];
    expect(() => d.tx(() => { d.putRecord('block', rec(a, '되돌려질 값')); throw new Error('본문 실패'); })).toThrow('본문 실패');
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 0, ROLLBACK: 1 });
    expect(stored(a)).toBeUndefined();
    sent.length = 0;
    d.tx(() => { d.lockRecords([{ table: 'block', id: b }]); d.putRecord('block', rec(b, '정상')); });
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), locks: locks() }).toEqual({ BEGIN: 1, COMMIT: 1, locks: 1 });
    expect(titleOf(stored(b))).toBe('정상');
  });

  it('안쪽 실패를 바깥이 잡고 계속하면 한 트랜잭션으로 커밋된다(따로 되돌리지 않는다 — 기존 동작)', () => {
    const [a, b] = [uid(), uid()];
    d.tx(() => {
      d.putRecord('block', rec(a, '바깥'));
      try {
        d.tx(() => { d.putRecord('block', rec(b, '안쪽에서 쓴 값')); throw new Error('안쪽 실패'); });
      } catch { /* 바깥이 계속한다 */ }
    });
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK') }).toEqual({ BEGIN: 1, COMMIT: 1, ROLLBACK: 0 });
    expect(titleOf(stored(a))).toBe('바깥');
    expect(titleOf(stored(b))).toBe('안쪽에서 쓴 값'); // 저장 지점이 없어 안쪽 쓰기도 함께 커밋된다
  });

  it('ROLLBACK 응답까지 실패해도 깊이는 돌아오고, 되돌리기 알림은 불린다(이때 나가는 오류는 ROLLBACK의 것 — 기존 동작)', () => {
    const a = uid();
    const undone: string[] = [];
    fail.rollback = 1;
    expect(() => d.tx(() => { d.putRecord('block', rec(a, '되돌려질 값')); d.onTxRollback(() => undone.push('알림')); throw new Error('본문 실패'); })).toThrow('ROLLBACK 실패 주입');
    expect(undone).toEqual(['알림']);
    expect(stored(a)).toBeUndefined();
    sent.length = 0;
    const b = uid();
    d.tx(() => { d.lockRecords([{ table: 'block', id: b }]); d.putRecord('block', rec(b, '정상')); });
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), locks: locks() }).toEqual({ BEGIN: 1, COMMIT: 1, locks: 1 });
  });

  it('COMMIT과 ROLLBACK이 모두 실패해도 그 뒤의 트랜잭션은 정상이다', () => {
    fail.commit = 1;
    fail.rollback = 1;
    expect(() => d.tx(() => d.putRecord('block', rec(uid(), '사라질 값')))).toThrow('ROLLBACK 실패 주입');
    sent.length = 0;
    const b = uid();
    d.tx(() => { d.tx(() => { d.lockRecords([{ table: 'block', id: b }]); d.putRecord('block', rec(b, '정상')); }); });
    expect({ BEGIN: count('BEGIN'), COMMIT: count('COMMIT'), ROLLBACK: count('ROLLBACK'), locks: locks() }).toEqual({ BEGIN: 1, COMMIT: 1, ROLLBACK: 0, locks: 1 });
    expect(titleOf(stored(b))).toBe('정상');
  });
});
