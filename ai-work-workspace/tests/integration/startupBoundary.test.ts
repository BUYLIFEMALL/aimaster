// 2026-11-19 WS-20261119-REL — 시작 경계: 모듈을 불러오는 것만으로는 DB에 가지 않고(빌드의 경로 평가),
// DB를 처음 쓰는 순간 표 확인 DDL → 시작 작업(이관·주기 예약·버전 맞춤) 순으로 한 번 실행되는지.
// DB 브리지(pg/bridge.ts)만 모의해 보낸 문장을 기록한다 — 실제 DB·네트워크 접속 0.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { kind: 'exec' | 'query'; text: string; params: unknown[] };
const h = vi.hoisted(() => ({
  calls: [] as { kind: 'exec' | 'query'; text: string; params: unknown[] }[],
  onExec: null as null | ((text: string, n: number) => void),
  onQuery: null as null | ((text: string, params: unknown[]) => Record<string, unknown>[] | undefined),
}));
vi.mock('../../src/litpage/server/pg/bridge.ts', () => {
  class PgError extends Error {
    code: string | null;
    constructor(message: string, code: string | null) {
      super(message);
      this.code = code;
    }
  }
  return {
    PgError,
    execSync: (text: string) => {
      h.calls.push({ kind: 'exec', text, params: [] });
      h.onExec?.(text, h.calls.filter((c) => c.kind === 'exec').length);
    },
    querySync: (text: string, params: unknown[] = []) => {
      h.calls.push({ kind: 'query', text, params });
      const rows = h.onQuery?.(text, params) ?? [];
      return { rows, count: rows.length };
    },
    closeBridge: () => {},
  };
});

// 변수로 이어 붙인 상대 경로는 vitest가 풀지 못하므로 파일 주소로 만든다
const SERVER = new URL('../../src/litpage/server/', import.meta.url).href;
const RUNTIME = new URL('../../src/server/runtime.ts', import.meta.url).href;
const execs = () => h.calls.filter((c) => c.kind === 'exec');
const queries = () => h.calls.filter((c) => c.kind === 'query');
const isDdl = (c: Call) => c.kind === 'exec' && /^\s*(CREATE|ALTER)\b/i.test(c.text);
const has = (re: RegExp, param?: string) => h.calls.some((c) => re.test(c.text) && (param === undefined || c.params.includes(param)));
const count = (re: RegExp, param?: string) => h.calls.filter((c) => re.test(c.text) && (param === undefined || c.params.includes(param))).length;
const SCHEDULE_KEYS = ['sprints:tick', 'w3set-temp-members:hourly', 'workspace-digest-sweep', 'meeting-retention', 'w3set-retention:daily'];

async function loadEverything() {
  await import(SERVER + 'api/modules.generated.ts');
  await import(RUNTIME);
  return import(SERVER + 'db.ts');
}

beforeEach(() => {
  vi.resetModules();
  h.calls = [];
  h.onExec = null;
  h.onQuery = null;
  vi.useFakeTimers({ now: new Date('2026-11-19T00:00:00Z') });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('불러오기만으로는 DB에 가지 않는다(빌드 평가)', () => {
  it('서버 기능 모듈 39개와 런타임 진입을 불러오고 16초가 지나도 브리지 호출 0', async () => {
    await loadEverything();
    expect(h.calls).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(16_000);
    expect(h.calls).toHaveLength(0);
  }, 120_000);
});

describe('첫 질의 경계', () => {
  it('첫 질의 직전에 DDL(불러온 순서) → 시작 작업 → 그 질의 순으로 한 번만 실행된다', async () => {
    const { db } = await loadEverything();
    db.prepare('SELECT 42 AS first_user_query').get();

    // 1) 맨 앞은 db.ts 자신의 표(가장 먼저 불려온 모듈), DDL 묶음이 모두 첫 일반 질의보다 앞
    expect(h.calls[0].kind).toBe('exec');
    expect(h.calls[0].text).toMatch(/CREATE TABLE IF NOT EXISTS records\b/);
    const firstQuery = h.calls.findIndex((c) => c.kind === 'query');
    const ddlCount = execs().filter(isDdl).length;
    expect(ddlCount).toBeGreaterThan(30);
    expect(h.calls.slice(0, firstQuery).every(isDdl)).toBe(true);
    expect(h.calls.slice(0, firstQuery)).toHaveLength(ddlCount);
    expect(h.calls.findIndex((c) => /scheduled_jobs \(/.test(c.text) && /CREATE TABLE/.test(c.text))).toBeLessThan(firstQuery);

    // 2) 시작 작업: 웹훅 비밀값 이관 조회, 주기 예약 5건, api_webhooks 버전 맞춤 — 각 한 번, 사용자 질의보다 앞
    const userQuery = h.calls.findIndex((c) => /first_user_query/.test(c.text));
    expect(userQuery).toBe(h.calls.length - 1);
    const migration = h.calls.findIndex((c) => c.kind === 'query' && /FROM records WHERE tbl = 'automation'/.test(c.text));
    expect(migration).toBeGreaterThan(-1);
    expect(migration).toBeLessThan(userQuery);
    for (const key of SCHEDULE_KEYS) expect(count(/INSERT INTO scheduled_jobs/, key), key).toBe(1);
    expect(count(/UPDATE api_webhooks SET api_version/)).toBe(1);

    // 3) 두 번째 질의부터는 다시 실행하지 않는다
    const before = h.calls.length;
    db.prepare('SELECT 43 AS second').get();
    expect(h.calls.length).toBe(before + 1);
    expect(execs().filter(isDdl)).toHaveLength(ddlCount);
  }, 120_000);

  it('지연 작업은 첫 질의 뒤에만: 일정 재등록 1.5초, 자동 스냅샷 15초', async () => {
    const { db } = await loadEverything();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(h.calls).toHaveLength(0);
    db.prepare('SELECT 1 AS x').get();
    expect(has(/FROM records WHERE tbl = 'workflow'/)).toBe(false);
    expect(has(/FROM activity WHERE created_time/)).toBe(false);
    await vi.advanceTimersByTimeAsync(1_600);
    expect(count(/FROM records WHERE tbl = 'workflow' AND alive = 1/)).toBe(1);
    expect(has(/FROM activity WHERE created_time/)).toBe(false);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(count(/FROM activity WHERE created_time/)).toBe(1);
  }, 120_000);

  it('레코드 읽기·트랜잭션처럼 Statement를 거치지 않는 경로도 같은 경계를 지난다', async () => {
    const dbm = await import(SERVER + 'db.ts');
    dbm.db.exec('CREATE TABLE IF NOT EXISTS t_boundary (id TEXT)');
    expect(h.calls).toHaveLength(0);
    dbm.getRecords('block', ['b1', 'b2']);
    expect(h.calls[0].text).toMatch(/CREATE TABLE IF NOT EXISTS records\b/);
    expect(h.calls.at(-2)!.text).toMatch(/t_boundary/);
    expect(h.calls.at(-1)!.kind).toBe('query');

    vi.resetModules();
    h.calls = [];
    const fresh = await import(SERVER + 'db.ts');
    fresh.tx(() => 1);
    const begin = h.calls.findIndex((c) => c.text === 'BEGIN');
    expect(begin).toBeGreaterThan(0);
    expect(h.calls.slice(0, begin).every(isDdl)).toBe(true); // DDL이 트랜잭션 밖에서 먼저 나간다
    expect(h.calls.at(-1)!.text).toBe('COMMIT');
  });
});

describe('시작 뒤에 불려온 모듈', () => {
  it('늦은 DDL과 늦은 시작 작업은 예전처럼 그 자리에서 바로 실행된다', async () => {
    const { db, atStartup } = await import(SERVER + 'db.ts');
    db.prepare('SELECT 1 AS x').get();
    const n = h.calls.length;

    db.exec('CREATE TABLE IF NOT EXISTS t_late (id TEXT)');
    expect(h.calls.length).toBe(n + 1); // 바로 보냄
    expect(h.calls[n]).toMatchObject({ kind: 'exec' });
    expect(h.calls[n].text).toMatch(/t_late/);

    const ran: string[] = [];
    atStartup(() => {
      ran.push('now');
      db.prepare('SELECT 3 AS z').get();
    });
    expect(ran).toEqual(['now']); // 등록 즉시
    expect(h.calls.at(-1)!.text).toMatch(/3 AS z/);
  });

  it('트랜잭션 안에서 잠금 뒤에 표를 만드는 코드: DDL이 잠금 조회와 COMMIT 사이에 그 순서대로 나간다(처음 쓰는 경우 포함)', async () => {
    const { db, tx } = await import(SERVER + 'db.ts');
    tx(() => {
      db.prepare("SELECT pg_advisory_xact_lock(hashtext('t:ddl'))").get();
      db.exec('CREATE TABLE IF NOT EXISTS t_locked (id TEXT)');
    });
    const texts = h.calls.map((c) => c.text);
    const begin = texts.indexOf('BEGIN');
    const lock = texts.findIndex((t) => /pg_advisory_xact_lock/.test(t));
    const ddl = texts.findIndex((t) => /t_locked/.test(t));
    const commit = texts.indexOf('COMMIT');
    expect(begin).toBeGreaterThan(-1);
    expect([lock, ddl, commit]).toEqual([begin + 1, begin + 2, begin + 3]);
  });
});

describe('재진입', () => {
  it('시작 작업 안의 질의·DDL·추가 등록이 교착이나 중복 시작 없이 지나간다', async () => {
    const { db, atStartup } = await import(SERVER + 'db.ts');
    const order: string[] = [];
    atStartup(() => {
      order.push('a');
      db.prepare('SELECT 10 AS in_task').get(); // 시작 중 질의
      db.exec('CREATE TABLE IF NOT EXISTS t_in_task (id TEXT)'); // 시작 중 DDL
      atStartup(() => order.push('c')); // 시작 중 추가 등록
      db.prepare('SELECT 11 AS in_task2').get();
    });
    atStartup(() => order.push('b'));
    db.prepare('SELECT 12 AS user').get();

    expect(order).toEqual(['a', 'b', 'c']);
    const texts = h.calls.map((c) => c.text);
    const at = (re: RegExp) => texts.findIndex((t) => re.test(t));
    expect(at(/CREATE TABLE IF NOT EXISTS records\b/)).toBe(0);
    expect(at(/10 AS in_task/)).toBeLessThan(at(/t_in_task/));
    expect(at(/t_in_task/)).toBeLessThan(at(/11 AS in_task2/));
    expect(at(/11 AS in_task2/)).toBeLessThan(at(/12 AS user/));
    expect(texts.filter((t) => /CREATE TABLE IF NOT EXISTS records\b/.test(t))).toHaveLength(1);

    db.prepare('SELECT 13 AS again').get();
    expect(order).toEqual(['a', 'b', 'c']); // 다시 돌지 않음
  });
});

describe('실패 처리 — 필수 DDL은 안전 실패, 시작 작업은 한 건씩 격리(자동 재실행 없음)', () => {
  const spyErrors = () => {
    const logged: unknown[][] = [];
    vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void logged.push(a));
    return logged;
  };

  it('필수 DDL 실패: 그 질의가 오류를 받고, 이후 질의도 같은 오류 — DDL을 다시 보내지 않고 시작 작업도 돌지 않는다', async () => {
    const { db, atStartup } = await import(SERVER + 'db.ts');
    const ran = vi.fn();
    atStartup(ran, 'probe');
    const boom = new Error('ddl failed');
    h.onExec = (_t, n) => {
      if (n === 1) throw boom;
    };
    expect(() => db.prepare('SELECT 1 AS x').get()).toThrow(boom);
    const sent = h.calls.length;
    expect(sent).toBe(1);
    h.onExec = null;
    expect(() => db.prepare('SELECT 2 AS y').get()).toThrow(boom);
    expect(h.calls.length).toBe(sent);
    expect(ran).not.toHaveBeenCalled();
  });

  it('시작 뒤의 늦은 DDL 실패는 부른 쪽만 오류를 받고, 다른 질의는 계속된다', async () => {
    const { db } = await import(SERVER + 'db.ts');
    db.prepare('SELECT 1 AS x').get();
    const boom = new Error('late ddl failed');
    h.onExec = () => {
      throw boom;
    };
    expect(() => db.exec('CREATE TABLE IF NOT EXISTS t_late_fail (id TEXT)')).toThrow(boom);
    h.onExec = null;
    expect(db.prepare('SELECT 2 AS y').get()).toBeUndefined();
  });

  it('시작 작업 한 건이 실패해도 그 질의·다른 시작 작업·이후 질의는 계속되고, 실패한 작업은 다시 돌지 않는다', async () => {
    const logged = spyErrors();
    const { db, atStartup } = await import(SERVER + 'db.ts');
    const first = vi.fn(() => {
      throw new Error('row (token)=(SECRET-VALUE-9) rejected');
    });
    const second = vi.fn();
    atStartup(first, 'first job');
    atStartup(second, 'second job');
    expect(db.prepare('SELECT 1 AS x').get()).toBeUndefined();
    expect(second).toHaveBeenCalledTimes(1);
    db.prepare('SELECT 2 AS y').get();
    db.prepare('SELECT 3 AS z').get();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(queries().map((c) => c.text.match(/\d AS \w/)?.[0])).toEqual(['1 AS x', '2 AS y', '3 AS z']);
    expect(logged).toEqual([['[startup] first job failed', 'error']]); // 정해 둔 작업 이름과 고정 분류만
    expect(JSON.stringify(logged)).not.toContain('SECRET-VALUE-9');
  });

  it('시작 뒤에 등록한 작업의 실패도 격리된다(부른 쪽이 깨지지 않음)', async () => {
    const logged = spyErrors();
    const { db, atStartup } = await import(SERVER + 'db.ts');
    db.prepare('SELECT 1 AS x').get();
    expect(() => atStartup(() => {
      throw Object.assign(new Error('boom (v)=(SECRET-LATE)'), { code: 'TIMEOUT' });
    }, 'late job')).not.toThrow();
    expect(db.prepare('SELECT 2 AS y').get()).toBeUndefined();
    expect(logged).toEqual([['[startup] late job failed', 'error']]); // 오류 객체의 code 값을 읽거나 기록하지 않는다
  });

  it('속성을 읽기만 해도 던지는 오류 객체: 기록 중에 다시 던지지 않고 격리가 유지되며, 임의 값은 기록되지 않는다', async () => {
    const logged = spyErrors();
    const { db, atStartup, errorKind } = await import(SERVER + 'db.ts');
    const trap = () => {
      throw new Error('getter exploded SECRET-GETTER');
    };
    const hostile = Object.defineProperties(new Error('x'), {
      code: { get: trap }, name: { get: trap }, message: { get: trap }, stack: { get: trap }, toString: { get: trap },
    });
    const proxy = new Proxy({}, { get: trap, has: trap, getPrototypeOf: trap, ownKeys: trap, getOwnPropertyDescriptor: trap });
    const arbitrary = Object.assign(new Error('y'), { code: 'SECRET_CODE_VALUE', name: 'SecretNameValue' });
    for (const e of [hostile, proxy, arbitrary, null, undefined, 'SECRET-STRING', 42, Symbol('s')]) expect(errorKind(e)).toBe('error');

    const after = vi.fn();
    atStartup(() => {
      throw hostile;
    }, 'hostile job');
    atStartup(() => {
      throw proxy;
    }, 'proxy job');
    atStartup(() => {
      throw arbitrary;
    }, 'arbitrary job');
    atStartup(after, 'after job');
    expect(db.prepare('SELECT 1 AS x').get()).toBeUndefined(); // 그 질의는 정상
    expect(after).toHaveBeenCalledTimes(1); // 뒤 작업도 실행
    expect(db.prepare('SELECT 2 AS y').get()).toBeUndefined();
    expect(logged).toEqual([
      ['[startup] hostile job failed', 'error'],
      ['[startup] proxy job failed', 'error'],
      ['[startup] arbitrary job failed', 'error'],
    ]);
    expect(JSON.stringify(logged)).not.toMatch(/SECRET|SecretNameValue/);
    // 시작 뒤 등록한 작업도 같다
    expect(() => atStartup(() => {
      throw hostile;
    }, 'late hostile job')).not.toThrow();
    expect(logged.at(-1)).toEqual(['[startup] late hostile job failed', 'error']);
  });

  it('전체 불러오기: 주기 예약 한 건이 실패해도 나머지 예약 4건·버전 맞춤·이관·사용자 질의·지연 타이머는 그대로 실행된다', async () => {
    const logged = spyErrors();
    const { PgError } = await import(SERVER + 'pg/bridge.ts');
    h.onQuery = (text, params) => {
      if (/INSERT INTO scheduled_jobs/.test(text) && params.includes('sprints:tick')) throw new PgError('insert failed (payload)=(SECRET-PAYLOAD)', '57014');
      return undefined;
    };
    const { db } = await loadEverything();
    expect(db.prepare('SELECT 42 AS first_user_query').get()).toBeUndefined();
    expect(count(/INSERT INTO scheduled_jobs/, 'sprints:tick')).toBe(1);
    for (const key of SCHEDULE_KEYS.filter((k) => k !== 'sprints:tick')) expect(count(/INSERT INTO scheduled_jobs/, key), key).toBe(1);
    expect(count(/UPDATE api_webhooks SET api_version/)).toBe(1);
    expect(count(/FROM records WHERE tbl = 'automation'/)).toBe(1);
    db.prepare('SELECT 43 AS second').get();
    await vi.advanceTimersByTimeAsync(17_000);
    expect(count(/INSERT INTO scheduled_jobs/, 'sprints:tick')).toBe(1); // 다시 시도하지 않음
    expect(count(/FROM records WHERE tbl = 'workflow' AND alive = 1/)).toBe(1);
    expect(count(/FROM activity WHERE created_time/)).toBe(1);
    expect(logged).toEqual([['[startup] sprints tick schedule failed', 'db']]);
    expect(JSON.stringify(logged)).not.toContain('SECRET-PAYLOAD');
  }, 120_000);

  it('지연 타이머 안의 실패: 기록에 오류 종류만 남고 이후 질의는 계속된다', async () => {
    const logged = spyErrors();
    const { PgError } = await import(SERVER + 'pg/bridge.ts');
    h.onQuery = (text) => {
      if (/FROM records WHERE tbl = 'workflow'/.test(text)) throw new PgError('select failed near SECRET-WF', '08006');
      if (/FROM activity WHERE created_time/.test(text)) throw new PgError('select failed near SECRET-ACT', '08006');
      return undefined;
    };
    const { db } = await loadEverything();
    db.prepare('SELECT 1 AS x').get();
    await vi.advanceTimersByTimeAsync(17_000);
    expect(db.prepare('SELECT 2 AS y').get()).toBeUndefined();
    expect(logged).toEqual([['[agents] schedule sync failed', 'db'], ['[pages] idle snapshot failed', 'db']]);
    expect(JSON.stringify(logged)).not.toMatch(/SECRET-WF|SECRET-ACT/);
  }, 120_000);

  it('웹훅 비밀값 이관 실패: 요청은 계속되고, 기록에는 작업 이름과 오류 종류만 남는다(값·오류 문구 미출력), 다시 돌지 않는다', async () => {
    const logged = spyErrors();
    const { PgError } = await import(SERVER + 'pg/bridge.ts');
    h.onQuery = (text) => {
      if (/FROM records WHERE tbl = 'automation'/.test(text)) throw new PgError('duplicate key value (header)=(Bearer SECRET-VALUE-123)', '23505');
      return undefined;
    };
    await import(SERVER + 'automations/engine.ts');
    const { db } = await import(SERVER + 'db.ts');
    expect(db.prepare('SELECT 1 AS x').get()).toBeUndefined(); // 질의는 정상 진행
    expect(logged).toEqual([['[startup] webhook secret migration failed', 'db']]);
    expect(JSON.stringify(logged)).not.toContain('SECRET-VALUE-123');
    db.prepare('SELECT 2 AS y').get(); // 이후 질의도 정상(이관은 다시 돌지 않음)
    expect(count(/FROM records WHERE tbl = 'automation'/)).toBe(1);
  }, 60_000);
});

describe('웹훅 비밀값 이관은 첫 읽기 결과보다 먼저 끝난다', () => {
  it('평문 헤더가 든 자동화 레코드가 첫 질의 직전에 봉인 저장된다(불러오기만으로는 그대로)', async () => {
    const plain = {
      id: 'auto1', version: 1, space_id: 's1', parent_id: 'c1', parent_table: 'collection', alive: true,
      actions: [{ id: 'step1', type: 'webhook', url: 'https://hooks.example.test/in', headers: [{ key: 'Authorization', value: 'Bearer PLAIN-TOKEN' }] }],
    };
    h.onQuery = (text) => (/FROM records WHERE tbl = 'automation'/.test(text) ? [{ data: JSON.stringify(plain) }] : undefined);
    await import(SERVER + 'automations/engine.ts');
    const { db } = await import(SERVER + 'db.ts');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.calls).toHaveLength(0);

    db.prepare('SELECT 77 AS first_read').get();
    const read = h.calls.findIndex((c) => /77 AS first_read/.test(c.text));
    const saved = h.calls.findIndex((c) => c.kind === 'query' && /INSERT INTO records/.test(c.text) && c.params.includes('auto1'));
    const secret = h.calls.findIndex((c) => c.kind === 'query' && /webhook_secrets/.test(c.text) && c.params.includes('Bearer PLAIN-TOKEN'));
    expect(secret).toBeGreaterThan(-1);
    expect(saved).toBeGreaterThan(-1);
    expect(saved).toBeLessThan(read);
    const stored = String(h.calls[saved].params.find((p) => typeof p === 'string' && p.includes('"actions"')));
    expect(stored).not.toContain('PLAIN-TOKEN'); // 레코드에는 자리표시만 남는다
  }, 60_000);
});

describe('cron 첫 호출', () => {
  it('runDueJobs의 첫 조회 직전에 DDL·시작 작업이 끝나고, 불러올 때 등록된 처리기로 작업이 실행된다', async () => {
    const sched = await import(SERVER + 'scheduler.ts');
    const handled: unknown[] = [];
    sched.registerJobHandler('test.kind', (payload: unknown) => void handled.push(payload)); // 메모리 등록 — DB 없음
    expect(h.calls).toHaveLength(0);
    const due = { key: 'test:1', kind: 'test.kind', run_at: 1, payload: '{"n":1}', attempts: 0, created_time: 1 };
    h.onQuery = (text) => {
      if (/FROM scheduled_jobs WHERE run_at <=/.test(text)) return [due];
      if (/DELETE FROM scheduled_jobs WHERE key = .* AND run_at =/.test(text)) return [{}]; // 선점 성공(1행)
      return undefined;
    };
    const ran = await sched.runDueJobs(Date.now());
    const dueAt = h.calls.findIndex((c) => /FROM scheduled_jobs WHERE run_at <=/.test(c.text));
    expect(h.calls.slice(0, dueAt).every(isDdl)).toBe(true);
    expect(dueAt).toBeGreaterThan(0);
    expect(ran).toBe(1);
    expect(handled).toEqual([{ n: 1 }]);
  });
});
