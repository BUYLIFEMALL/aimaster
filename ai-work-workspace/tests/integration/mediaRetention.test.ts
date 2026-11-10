// 2026-11-11 보관 예외: 음악·영상 파일은 30일 뒤 지우고, 그 밖의 파일·예외 회원 파일·30일 안 파일은 남긴다. 로컬 Docker Postgres(aww-pg-test)만 쓴다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let db: typeof import('../../src/litpage/server/db.ts');
let media: typeof import('../../src/server/mediaRetention.ts');

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 11);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  await import('../../src/litpage/server/content/files.ts');
  media = await import('../../src/server/mediaRetention.ts');
  const put = (n: number, user: string, mime: string, t: number) =>
    db.db.prepare('INSERT INTO files (id, space_id, user_id, name, mime, size, path, created_time, private, render, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id(n), 's1', user, `f${n}`, mime, 3, '', t, 0, 0, Buffer.from('abc'));
  put(1, 'u1', 'audio/mpeg', NOW - 31 * DAY); // 지움
  put(2, 'u1', 'video/mp4', NOW - 31 * DAY); // 지움
  put(3, 'u1', 'audio/mpeg', NOW - 10 * DAY); // 30일 안 — 남음
  put(4, 'u1', 'image/png', NOW - 200 * DAY); // 음악·영상 아님 — 남음
  put(5, 'u1', 'application/pdf', NOW - 200 * DAY); // 남음
  put(6, 'vip', 'video/mp4', NOW - 200 * DAY); // 예외 회원 — 남음
});

describe('음악·영상 파일 30일 정리(보관 예외)', () => {
  it('30일 지난 음악·영상만 지우고 다른 파일·예외 회원 파일은 남긴다', () => {
    expect(media.runMediaRetention(NOW, 2_000, new Set(['vip']))).toEqual({ files: 2 });
    const left = (db.db.prepare('SELECT id FROM files ORDER BY id').all() as { id: string }[]).map((r) => r.id);
    expect(left).toEqual([id(3), id(4), id(5), id(6)]);
  });
});
