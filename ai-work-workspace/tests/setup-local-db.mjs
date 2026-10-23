// 로컬 시험 DB 준비: Docker Postgres(aww-pg-test, 127.0.0.1:55432)에 운영과 같은 마이그레이션을 적용하고
// aww_app 계정으로 접속하는 주소를 출력한다. 시험 전용이며 운영 DB에는 쓰지 않는다.
//   docker run -d --name aww-pg-test -e POSTGRES_PASSWORD=awwlocal -e POSTGRES_DB=aww -p 127.0.0.1:55432:5432 postgres:17-alpine
//   node tests/setup-local-db.mjs [--reset]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const ADMIN_URL = process.env.AWW_LOCAL_ADMIN_URL ?? 'postgres://postgres:awwlocal@127.0.0.1:55432/aww';
export const LOCAL_APP_URL = 'postgres://aww_app:awwapp@127.0.0.1:55432/aww';

export async function setupLocalDb({ reset = false } = {}) {
  const sql = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  try {
    if (reset) await sql.unsafe('drop schema if exists aww cascade');
    const migration = readFileSync(join(import.meta.dirname, '..', 'supabase', 'migrations', '20261024000000_ai_work_workspace_init.sql'), 'utf8');
    await sql.unsafe(migration).simple();
    await sql.unsafe("alter role aww_app password 'awwapp'");
  } finally {
    await sql.end();
  }
  return LOCAL_APP_URL;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('setup-local-db.mjs')) {
  const url = await setupLocalDb({ reset: process.argv.includes('--reset') });
  console.log(url);
}
