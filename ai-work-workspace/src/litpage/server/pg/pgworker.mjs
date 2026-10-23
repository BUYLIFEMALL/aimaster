// 동기 DB 다리의 작업 스레드(worker) 쪽. 서버 본체(bridge.ts)가 보낸 SQL을 postgres.js로 실행하고,
// 결과를 전용 MessagePort에 넣은 뒤 공유 메모리 신호(Atomics.notify)로 본체의 대기를 풀어 준다.
// 연결은 1개만 쓴다(max: 1) — 본체가 한 번에 한 질의만 보내므로 BEGIN…COMMIT이 같은 연결에서 이어진다.
//
// 접속 주소: AWW_DATABASE_URL이 있으면 그대로 쓴다(로컬 시험). 운영은 비밀번호를 사람·화면·환경변수 어디에도 두지 않고,
// 운영 DB의 Supabase Vault가 만든 aww_app 비밀번호를 service role로만 부를 수 있는 함수(public.aww_db_password)로
// 처음 접속할 때 한 번 읽어 연결 풀 주소를 만든다(마이그레이션 20261024000100).
import { workerData } from 'node:worker_threads';
import postgres from 'postgres';

const { url, supabaseUrl, serviceKey, poolerHost, projectRef, signal, port } = workerData;
const flag = new Int32Array(signal);

let sql = null;

async function connectionUrl() {
  if (url) return url;
  if (!supabaseUrl || !serviceKey || !poolerHost || !projectRef) throw new Error('DB 접속 정보가 없습니다.');
  const res = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/rest/v1/rpc/aww_db_password`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`DB 비밀번호를 읽지 못했습니다 (HTTP ${res.status}).`);
  const password = await res.json();
  if (typeof password !== 'string' || password.length < 16) throw new Error('DB 비밀번호 형식이 올바르지 않습니다.');
  return `postgres://aww_app.${projectRef}:${encodeURIComponent(password)}@${poolerHost}:6543/postgres`;
}

async function client() {
  if (sql) return sql;
  sql = postgres(await connectionUrl(), {
    max: 1,
    prepare: false, // Supabase 연결 풀(transaction 모드)에서는 준비된 문장을 쓸 수 없다
    idle_timeout: 30,
    connect_timeout: 15,
    onnotice: () => {},
    types: {
      // 원본 SQLite는 정수를 JS 숫자로 돌려준다 — int8/numeric도 숫자로 받는다(밀리초 시각은 2^53 안)
      bigint: { to: 20, from: [20, 1700], serialize: (x) => String(x), parse: (x) => Number(x) },
    },
  });
  return sql;
}

function reply(out) {
  port.postMessage(out);
  Atomics.store(flag, 0, 1);
  Atomics.notify(flag, 0);
}

port.on('message', async (msg) => {
  try {
    if (msg.kind === 'query') {
      const res = await (await client()).unsafe(msg.text, msg.params);
      reply({ ok: true, rows: Array.from(res), count: res.count ?? 0 });
    } else if (msg.kind === 'exec') {
      // 여러 문장을 한 번에 보내는 경우(DDL 묶음 등): 단순 질의 프로토콜로 실행
      await (await client()).unsafe(msg.text).simple();
      reply({ ok: true, rows: [], count: 0 });
    } else if (msg.kind === 'end') {
      if (sql) await sql.end({ timeout: 5 });
      sql = null;
      reply({ ok: true, rows: [], count: 0 });
    }
  } catch (e) {
    // 접속 정보가 섞인 오류 문구는 그대로 내보내지 않는다
    const message = String(e?.message ?? e).replace(/postgres:\/\/[^\s]+/g, 'postgres://[redacted]');
    reply({ ok: false, message, code: e?.code ?? null });
  }
});
