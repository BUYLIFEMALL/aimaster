// 동기 DB 다리(본체 쪽). 원본 litpage 서버는 node:sqlite의 동기 API(prepare().get/all/run, exec)를 전제로
// 4만 줄이 짜여 있어, 공용 Supabase Postgres로 옮기면서도 그 코드를 그대로 쓰려고 이 다리를 둔다.
// 작업 스레드(pgworker.mjs)에 SQL을 보내고 Atomics.wait로 결과가 올 때까지 기다린 뒤 receiveMessageOnPort로
// 결과를 바로 꺼낸다. 함수 지역을 DB와 같은 서울(icn1)에 두어 왕복을 몇 ms로 유지한다(vercel.json).
import { MessageChannel, receiveMessageOnPort, Worker, type MessagePort } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export class PgError extends Error {
  code: string | null;
  constructor(message: string, code: string | null) {
    super(message);
    this.code = code;
  }
}

interface Reply {
  ok: boolean;
  rows: Record<string, unknown>[];
  count: number;
  message?: string;
  code?: string | null;
}

const TIMEOUT_MS = Number(process.env.AWW_DB_TIMEOUT_MS ?? 30_000);

let worker: Worker | null = null;
let port: MessagePort | null = null;
let flag: Int32Array | null = null;

function workerPath(): string {
  // Next 빌드 결과에서도 찾을 수 있게 프로젝트 기준 경로를 쓴다(next.config.ts outputFileTracingIncludes)
  const candidates = [
    join(process.cwd(), 'src/litpage/server/pg/pgworker.mjs'),
    join(process.cwd(), 'ai-work-workspace/src/litpage/server/pg/pgworker.mjs'),
  ];
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) throw new Error('pgworker.mjs를 찾을 수 없습니다.');
  return hit;
}

export function databaseUrl(): string {
  const url = process.env.AWW_DATABASE_URL?.trim();
  if (!url) throw new Error('AWW_DATABASE_URL 환경변수가 설정되지 않았습니다.');
  return url;
}

function ensureWorker() {
  if (worker && port && flag) return;
  const signal = new SharedArrayBuffer(4);
  const channel = new MessageChannel();
  flag = new Int32Array(signal);
  port = channel.port1;
  worker = new Worker(workerPath(), {
    workerData: { url: databaseUrl(), signal, port: channel.port2 },
    transferList: [channel.port2],
  });
  // 작업 스레드가 프로세스 종료를 막지 않게 한다
  worker.unref();
  port.unref();
  worker.on('error', (e) => {
    console.error('[pg] worker error', e);
    worker = null;
    port = null;
    flag = null;
  });
}

function call(msg: { kind: 'query' | 'exec' | 'end'; text?: string; params?: unknown[] }): Reply {
  ensureWorker();
  Atomics.store(flag!, 0, 0);
  port!.postMessage(msg);
  const r = Atomics.wait(flag!, 0, 0, TIMEOUT_MS);
  if (r === 'timed-out') {
    // 응답이 늦게 오면 다음 질의와 섞이므로 작업 스레드를 버리고 새로 띄운다
    void worker?.terminate();
    worker = null;
    port = null;
    flag = null;
    throw new PgError('DB 응답 시간이 초과되었습니다.', 'TIMEOUT');
  }
  const got = receiveMessageOnPort(port!);
  if (!got) throw new PgError('DB 응답을 받지 못했습니다.', 'NO_REPLY');
  const reply = got.message as Reply;
  if (!reply.ok) throw new PgError(reply.message ?? 'DB 오류', reply.code ?? null);
  return reply;
}

export function querySync(text: string, params: unknown[] = []): { rows: Record<string, unknown>[]; count: number } {
  const r = call({ kind: 'query', text, params });
  return { rows: r.rows, count: r.count };
}

export function execSync(text: string): void {
  call({ kind: 'exec', text });
}

export function closeBridge(): void {
  if (!worker) return;
  try {
    call({ kind: 'end' });
  } finally {
    void worker?.terminate();
    worker = null;
    port = null;
    flag = null;
  }
}
