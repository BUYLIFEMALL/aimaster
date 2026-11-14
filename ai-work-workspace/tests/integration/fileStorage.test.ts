// 큰 파일 Storage 저장(2026-11-14, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md A) — 가짜 Storage로 확인(실제 업로드 없음).
// 1. 4MB 이하·50MB 초과는 거절, 저장공간이 가득 차면 403(「저장공간 늘리기」 안내).
// 2. 올리기 주소를 받으면 「대기」 줄이 생기고, 실제로 올라간 뒤 「끝」을 알리면 대기가 풀린다(안 올라갔으면 409).
// 3. 내려받기는 권한 확인 뒤 Storage 경로를 돌려준다(남·대기 중이면 404). 경로 첫 칸은 회원 번호(메인 용량 계산이 셈).
// 4. 30일 정리는 Storage 경로를 돌려주고, 하루 넘은 대기 줄은 Storage와 함께 지운다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let fs_: typeof import('../../src/server/fileStorage.ts');
let files: typeof import('../../src/server/files.ts');
let media: typeof import('../../src/server/mediaRetention.ts');
let db: typeof import('../../src/litpage/server/db.ts');
const amy = { id: '66666666-6666-4666-8666-666666666666', email: 'fs-amy@example.com', name: '에이미' };
const ben = { id: '77777777-7777-4777-8777-777777777777', email: 'fs-ben@example.com', name: '벤' };
const MB = 1024 * 1024;

const objects = new Map<string, number>(); // 경로 → 크기
const removed: string[] = [];
let quotaFull = false;
const fakeStore = () => ({
  getBucket: async () => ({ data: { id: 'workspace-files' }, error: null }),
  createBucket: async () => ({ data: null, error: null }),
  from: () => ({
    createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/upload/${path}`, token: 't', path }, error: null }),
    list: async (dir: string, o: { search: string }) => ({ data: [...objects.entries()].filter(([p]) => p === `${dir}/${o.search}`).map(([p, size]) => ({ name: p.split('/').pop(), metadata: { size } })), error: null }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/get/${path}` }, error: null }),
    remove: async (paths: string[]) => {
      removed.push(...paths);
      return { data: paths.map((name) => ({ name })), error: null };
    },
  }),
});

beforeAll(async () => {
  db = await import('../../src/litpage/server/db.ts');
  const runtime = await import('../../src/server/runtime');
  fs_ = await import('../../src/server/fileStorage.ts');
  files = await import('../../src/server/files.ts');
  media = await import('../../src/server/mediaRetention.ts');
  fs_.setFileStorageForTests({ store: fakeStore as never, quota: async () => ({ allowed: !quotaFull, message: quotaFull ? '저장공간이 가득 찼습니다.' : null, upgradeUrl: 'https://www.buylife.xyz/storage' }) });
  for (const m of [amy, ben]) await runtime.runRpc('loadAccountData', {}, m);
});

describe('큰 파일 Storage 저장', () => {
  it('4MB 이하·50MB 초과 거절, 저장공간 가득 차면 403', async () => {
    expect((await fs_.signLargeUpload(amy, { name: 'a.pdf', type: 'application/pdf', size: 3 * MB })).status).toBe(400);
    expect((await fs_.signLargeUpload(amy, { name: 'a.pdf', type: 'application/pdf', size: 51 * MB })).status).toBe(413);
    quotaFull = true;
    const full = await fs_.signLargeUpload(amy, { name: 'a.pdf', type: 'application/pdf', size: 10 * MB });
    quotaFull = false;
    expect(full.status).toBe(403);
    expect(full.body).toMatchObject({ code: 'STORAGE_FULL', upgradeUrl: 'https://www.buylife.xyz/storage' });
  });

  let id = '';
  it('올리기 주소 → 대기 줄, 올라가기 전 「끝」은 409, 올라간 뒤 「끝」이면 대기 풀림', async () => {
    const s = await fs_.signLargeUpload(amy, { name: '회의 자료.pdf', type: 'application/pdf', size: 10 * MB });
    expect(s.status).toBe(200);
    id = s.body.id as string;
    const row = db.withRequestCache(() => db.db.prepare('SELECT storage_path, pending, content FROM files WHERE id = ?').get(id)) as { storage_path: string; pending: number; content: unknown };
    expect(row.pending).toBe(1);
    expect(row.content).toBeNull();
    expect(row.storage_path.startsWith(`${amy.id}/${id}/`)).toBe(true);
    expect((await fs_.finishLargeUpload(amy, { id })).status).toBe(409);
    expect((await fs_.finishLargeUpload(ben, { id })).status).toBe(404); // 남의 파일
    objects.set(row.storage_path, 10 * MB);
    const done = await fs_.finishLargeUpload(amy, { id });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ id, name: '회의 자료.pdf', size: 10 * MB });
    expect(String(done.body.url)).toMatch(new RegExp(`^/files/${id}/`));
  });

  it('내려받기: 올린 사람은 Storage 경로, 남은 404', () => {
    const mine = db.withRequestCache(() => files.downloadFile(amy.id, id, false));
    expect(mine).toMatchObject({ name: '회의 자료.pdf' });
    expect((mine as { storagePath: string }).storagePath.startsWith(amy.id)).toBe(true);
    const other = db.withRequestCache(() => files.downloadFile(ben.id, id, false));
    expect(other instanceof Response && other.status).toBe(404);
  });

  it('30일 정리는 Storage 경로를 돌려주고, 하루 넘은 대기 줄은 Storage와 함께 지운다', async () => {
    const v = await fs_.signLargeUpload(amy, { name: 'clip.mp4', type: 'video/mp4', size: 20 * MB });
    const vid = v.body.id as string;
    const old = Date.now() - 31 * 86_400_000;
    db.withRequestCache(() => db.db.prepare('UPDATE files SET pending = 0, created_time = ? WHERE id = ?').run(old, vid));
    const r = db.withRequestCache(() => media.runMediaRetention(Date.now(), 100, new Set()));
    expect(r.files).toBeGreaterThanOrEqual(1);
    expect(r.storagePaths.some((p) => p.includes(vid))).toBe(true);

    const p = await fs_.signLargeUpload(amy, { name: 'never.zip', type: 'application/zip', size: 6 * MB });
    const pid = p.body.id as string;
    db.withRequestCache(() => db.db.prepare('UPDATE files SET created_time = ? WHERE id = ?').run(Date.now() - 2 * 86_400_000, pid));
    expect(await fs_.cleanupPendingUploads()).toBeGreaterThanOrEqual(1);
    expect(removed.some((x) => x.includes(pid))).toBe(true);
    expect(db.withRequestCache(() => db.db.prepare('SELECT id FROM files WHERE id = ?').get(pid))).toBeUndefined();
  });
});
