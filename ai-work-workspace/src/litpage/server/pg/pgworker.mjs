// 동기 DB 다리의 작업 스레드(worker) 쪽. 서버 본체(bridge.ts)가 보낸 SQL을 postgres.js로 실행하고,
// 결과를 전용 MessagePort에 넣은 뒤 공유 메모리 신호(Atomics.notify)로 본체의 대기를 풀어 준다.
// 연결은 1개만 쓴다(max: 1) — 본체가 한 번에 한 질의만 보내므로 BEGIN…COMMIT이 같은 연결에서 이어진다.
import { workerData } from 'node:worker_threads';
import postgres from 'postgres';

const { url, signal, port } = workerData;
const flag = new Int32Array(signal);

const sql = postgres(url, {
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

function reply(out) {
  port.postMessage(out);
  Atomics.store(flag, 0, 1);
  Atomics.notify(flag, 0);
}

port.on('message', async (msg) => {
  try {
    if (msg.kind === 'query') {
      const res = await sql.unsafe(msg.text, msg.params);
      reply({ ok: true, rows: Array.from(res), count: res.count ?? 0 });
    } else if (msg.kind === 'exec') {
      // 여러 문장을 한 번에 보내는 경우(DDL 묶음 등): 단순 질의 프로토콜로 실행
      await sql.unsafe(msg.text).simple();
      reply({ ok: true, rows: [], count: 0 });
    } else if (msg.kind === 'end') {
      await sql.end({ timeout: 5 });
      reply({ ok: true, rows: [], count: 0 });
    }
  } catch (e) {
    reply({ ok: false, message: String(e?.message ?? e), code: e?.code ?? null });
  }
});
