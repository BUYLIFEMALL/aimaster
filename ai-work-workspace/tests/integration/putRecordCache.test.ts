// putRecord와 요청 캐시 — WS-20261119-03 A, Master msg_d48ab4279b48.
// putRecord는 (tbl, id) 한 줄만 바꾸고 그 키를 새 값으로 캐시에 넣는다. 예전에는 쓰기마다 요청 캐시 전체가 비워져
// 같은 부모·컬렉션을 블록마다 다시 읽었다(문서 많은 가져오기 DB 호출의 약 45%).
// 여기서는 「그 한 줄 쓰기만 전체 비움을 생략」하고 나머지 비움(일반 SQL 쓰기·되돌리기·잠금)은 그대로임을 고정한다.
// 로컬 전용 fixture만 쓴다(AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

// DB 다리 호출을 센다(문장 원문 포함). other()는 「다른 연결·다른 서버가 쓴 것」처럼 캐시를 거치지 않고 DB만 바꾼다.
const seen: string[] = [];
let raw: (text: string, params?: unknown[]) => { rows: Record<string, unknown>[]; count: number };
vi.mock('../../src/litpage/server/pg/bridge.ts', async (orig) => {
  const real = (await orig()) as Record<string, any>;
  raw = real.querySync;
  return {
    ...real,
    querySync: (text: string, params?: unknown[]) => { seen.push(text); return real.querySync(text, params); },
    execSync: (text: string) => { seen.push(text); return real.execSync(text); },
  };
});

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let d: typeof import('../../src/litpage/server/db.ts');

const kim = { id: '55555555-5555-4555-8555-555555555555', email: 'cache-kim@example.com', name: '킴' };
let spaceId = '';
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const rec = (id: string, title: string, version = 1) => ({ id, version, type: 'text', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, properties: { title: [[title]] } }) as any;
const reads = () => seen.filter((s) => /^SELECT data FROM records WHERE tbl = \$1 AND id = \$2$/.test(s.replace(/\s+/g, ' ').trim())).length;
const titleOf = (r: any) => r?.properties?.title?.[0]?.[0];
const inDb = (id: string) => {
  const row = raw("SELECT data FROM records WHERE tbl = 'block' AND id = $1", [id]).rows[0] as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
};
/** 캐시를 거치지 않고 DB 값만 바꾼다(다른 서버 인스턴스의 쓰기 흉내) */
const other = (id: string, title: string, version: number) => raw("UPDATE records SET data = $2, version = $3 WHERE tbl = 'block' AND id = $1", [id, JSON.stringify(rec(id, title, version)), version]);

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  d = await import('../../src/litpage/server/db.ts');
  await runtime.runRpc('loadAccountData', {}, kim);
  const r = await runtime.runRpc('createWorkspace', { name: '캐시' }, kim);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
});

describe('putRecord와 요청 캐시', () => {
  it('한 줄을 써도 다른 키의 캐시는 남는다(다시 읽지 않는다)', () => {
    const [a, b] = [uid(), uid()];
    d.putRecord('block', rec(a, 'A'));
    d.putRecord('block', rec(b, 'B'));
    d.withRequestCache(() => {
      expect(titleOf(d.getRecord('block', a))).toBe('A');
      const before = reads();
      d.putRecord('block', rec(b, 'B2', 2));
      expect(titleOf(d.getRecord('block', a))).toBe('A'); // 캐시에서
      expect(titleOf(d.getRecord('block', b))).toBe('B2'); // 방금 쓴 값, 캐시에서
      expect(reads()).toBe(before);
    });
    expect(titleOf(inDb(b))).toBe('B2');
    expect(inDb(b).version).toBe(2);
  });

  it('없다고 캐시된 키를 새로 쓰면 바로 보인다', () => {
    const a = uid();
    d.withRequestCache(() => {
      expect(d.getRecord('block', a)).toBeUndefined();
      const before = reads();
      expect(d.getRecord('block', a)).toBeUndefined(); // 「없음」도 캐시된다
      expect(reads()).toBe(before);
      d.putRecord('block', rec(a, '새로'));
      expect(titleOf(d.getRecord('block', a))).toBe('새로');
      expect(reads()).toBe(before);
    });
  });

  it('캐시에 넣은 값은 넘긴 객체와 따로다(쓴 뒤 객체를 고쳐도 캐시·DB는 그대로)', () => {
    const a = uid();
    d.withRequestCache(() => {
      const value = rec(a, '원래');
      d.putRecord('block', value);
      value.properties.title[0][0] = '고침';
      expect(titleOf(d.getRecord('block', a))).toBe('원래');
    });
    expect(titleOf(inDb(a))).toBe('원래');
  });

  it('일반 SQL로 records를 쓰면 예전처럼 캐시 전체를 비운다(prepare().run · exec)', () => {
    const [a, b] = [uid(), uid()];
    d.putRecord('block', rec(a, 'A'));
    d.putRecord('block', rec(b, 'B'));
    d.withRequestCache(() => {
      d.getRecord('block', a);
      d.getRecord('block', b);
      let before = reads();
      d.db.prepare('UPDATE records SET alive = 1 WHERE tbl = ? AND id = ?').run('block', b);
      d.getRecord('block', a);
      expect(reads()).toBe(before + 1); // 다른 키도 다시 읽었다
      before = reads();
      d.db.exec(`UPDATE records SET alive = 1 WHERE tbl = 'block' AND id = '${b}'`);
      d.getRecord('block', a);
      expect(reads()).toBe(before + 1);
    });
  });

  it('트랜잭션이 되돌려지면 그 안에서 쓴 값이 캐시에 남지 않는다', () => {
    const [a, b] = [uid(), uid()];
    d.putRecord('block', rec(a, '처음'));
    d.withRequestCache(() => {
      expect(titleOf(d.getRecord('block', a))).toBe('처음');
      expect(() => d.tx(() => {
        d.putRecord('block', rec(a, '되돌려질 값', 2));
        d.putRecord('block', rec(b, '되돌려질 새 줄'));
        expect(titleOf(d.getRecord('block', a))).toBe('되돌려질 값'); // 트랜잭션 안에서는 쓴 값이 보인다
        throw new Error('실패 주입');
      })).toThrow('실패 주입');
      expect(titleOf(d.getRecord('block', a))).toBe('처음');
      expect(d.getRecord('block', b)).toBeUndefined();
    });
    expect(titleOf(inDb(a))).toBe('처음');
    expect(inDb(b)).toBeUndefined();
  });

  it('겹친 트랜잭션: 안쪽이 끝난 뒤 바깥이 실패해도 모두 되돌려지고 캐시에 남지 않는다', () => {
    const [a, b] = [uid(), uid()];
    d.putRecord('block', rec(a, '처음'));
    d.withRequestCache(() => {
      d.getRecord('block', a);
      expect(() => d.tx(() => {
        d.tx(() => {
          d.putRecord('block', rec(a, '안쪽', 2));
        });
        expect(titleOf(d.getRecord('block', a))).toBe('안쪽');
        d.putRecord('block', rec(b, '바깥'));
        throw new Error('바깥 실패');
      })).toThrow('바깥 실패');
      expect(titleOf(d.getRecord('block', a))).toBe('처음');
      expect(d.getRecord('block', b)).toBeUndefined();
    });
    expect(titleOf(inDb(a))).toBe('처음');
  });

  it('쓰는 문장 자체가 실패하면 캐시는 예전 값 그대로이고, 되돌린 뒤에도 DB와 같다', () => {
    const a = uid();
    d.putRecord('block', rec(a, '처음'));
    d.withRequestCache(() => {
      d.getRecord('block', a);
      const bad = { ...rec(a, '실패할 값', 2), last_edited_time: 'not-a-number' };
      expect(() => d.tx(() => d.putRecord('block', bad))).toThrow();
      expect(titleOf(d.getRecord('block', a))).toBe('처음');
    });
    expect(titleOf(inDb(a))).toBe('처음');
  });

  it('잠근 뒤에는 최신 값을 읽는다(다른 서버가 그사이 바꾼 값)', () => {
    const [a, b] = [uid(), uid()];
    d.putRecord('block', rec(a, 'A'));
    d.putRecord('block', rec(b, 'B'));
    d.withRequestCache(() => {
      expect(titleOf(d.getRecord('block', a))).toBe('A');
      other(a, '남이 바꿈', 2);
      d.putRecord('block', rec(b, 'B2', 2)); // 내 쓰기는 다른 키의 캐시를 비우지 않는다
      expect(titleOf(d.getRecord('block', a))).toBe('A'); // 아직 요청 안 캐시(잠그기 전에는 예전에도 보장되지 않던 값)
      d.tx(() => {
        d.lockRecords([{ table: 'block', id: a }]);
        expect(titleOf(d.getRecord('block', a))).toBe('남이 바꿈'); // 잠그면 캐시를 비우고 최신 값
      });
    });
  });

  it('요청 캐시 밖에서는 캐시하지 않는다(매번 DB에서 읽는다)', () => {
    const a = uid();
    d.putRecord('block', rec(a, 'A'));
    other(a, '남이 바꿈', 2);
    expect(titleOf(d.getRecord('block', a))).toBe('남이 바꿈');
  });

  it('applyTransactions 한 번에 여러 블록을 만들 때 같은 부모를 블록마다 다시 읽지 않는다', async () => {
    const records = await import('../../src/litpage/server/records.ts');
    const host = await runtime.runRpc('createPage', { spaceId, parent: { kind: 'private' }, title: '부모' }, kim).catch(() => null);
    // createPage 명령 이름이 다를 수 있으므로, 없으면 직접 만든 페이지를 부모로 쓴다
    let pageId = (host?.body as any)?.pageId ?? (host?.body as any)?.id;
    if (!pageId || host?.status !== 200) {
      pageId = uid();
      d.putRecord('block', { id: pageId, version: 1, type: 'page', space_id: spaceId, parent_id: spaceId, parent_table: 'space', alive: true, content: [], properties: { title: [['부모']] }, permissions: [{ type: 'user_permission', role: 'editor', user_id: kim.id }] } as any);
    }
    const ids = Array.from({ length: 30 }, () => uid());
    const ops = ids.flatMap((id) => [
      { pointer: { table: 'block', id, spaceId }, path: [], command: 'set', args: { id, type: 'text', space_id: spaceId, parent_id: pageId, parent_table: 'block', alive: true, properties: { title: [[`줄 ${id.slice(-3)}`]] } } },
      { pointer: { table: 'block', id: pageId, spaceId }, path: ['content'], command: 'listAfter', args: { id } },
    ]);
    const before = reads();
    const out = d.withRequestCache(() => records.applyTransactions(kim.id, [{ id: uid(), spaceId, operations: ops as any }]));
    expect(out.length).toBe(31);
    // 예전: 블록마다 부모·자기 자신을 다시 읽어 30블록에 150회 안팎. 지금: 블록 수에 비례하지 않는 수준
    expect(reads() - before).toBeLessThan(80);
    for (const id of ids) expect(inDb(id)?.parent_id).toBe(pageId);
    expect(inDb(pageId).content).toEqual(expect.arrayContaining(ids));
  });
});
