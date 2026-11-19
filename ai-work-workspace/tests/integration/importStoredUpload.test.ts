// 4MiB를 넘어 Storage로 올라간 파일의 가져오기 — WS-20261119-02에서 발견한 기존 결함의 재현과 고정.
// 4MiB 초과 파일은 내용이 DB가 아니라 Storage에 있고(files.storage_path), 가져오기(importFiles)는 동기 코드라 그 내용을 읽지 못한다.
// 가짜 Storage로 확인한다(실제 업로드 없음). 로컬 Postgres 전용 fixture만 쓴다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let fs_: typeof import('../../src/server/fileStorage.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');
const kim = { id: '12121212-1212-4212-8212-121212121212', email: 'stored-kim@example.com', name: '킴' };
const MB = 1024 * 1024;
let spaceId = '';

const objects = new Map<string, Buffer>(); // Storage 경로 → 내용
const downloads: string[] = [];
const fakeStore = () => ({
  getBucket: async () => ({ data: { id: 'workspace-files' }, error: null }),
  createBucket: async () => ({ data: null, error: null }),
  from: () => ({
    createSignedUploadUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/upload/${path}`, token: 't', path }, error: null }),
    list: async (dir: string, o: { search: string }) => ({ data: [...objects.entries()].filter(([p]) => p === `${dir}/${o.search}`).map(([p, b]) => ({ name: p.split('/').pop(), metadata: { size: b.length } })), error: null }),
    createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://store.test/get/${path}` }, error: null }),
    download: async (path: string) => {
      downloads.push(path);
      const b = objects.get(path);
      return b ? { data: new Blob([new Uint8Array(b)]), error: null } : { data: null, error: { message: 'not found' } };
    },
    remove: async (paths: string[]) => ({ data: paths.map((name) => ({ name })), error: null }),
  }),
});

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  fs_ = await import('../../src/server/fileStorage.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  fs_.setFileStorageForTests({ store: fakeStore as never, quota: async () => ({ allowed: true, message: null, upgradeUrl: '' }) });
  await runtime.runRpc('loadAccountData', {}, kim);
  const r = await runtime.runRpc('createWorkspace', { name: '저장소 시험' }, kim);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
});

/** 화면이 하는 것과 같은 순서: 올리기 주소 받기 → Storage에 올라감 → 끝 알림 */
async function uploadLarge(name: string, data: Buffer) {
  const signed = await fs_.signLargeUpload(kim, { name, type: 'application/zip', size: data.length, spaceId });
  expect(signed.status).toBe(200);
  const path = String(signed.body.uploadUrl).replace('https://store.test/upload/', '');
  objects.set(path, data);
  const done = await fs_.finishLargeUpload(kim, { id: signed.body.id });
  expect(done.status).toBe(200);
  return { url: String(done.body.url), path };
}

describe('4MiB 넘는 가져오기 파일(Storage 보관)', () => {
  it('6MiB ZIP: Storage로 올라간 뒤 가져오기 결과', async () => {
    // 압축되지 않는 채움 파일로 ZIP 자체를 4MiB보다 크게 만든다
    const filler = Buffer.alloc(6 * MB);
    for (let i = 0; i < filler.length; i += 4) filler.writeUInt32LE((Math.imul(i, 2654435761) ^ (i >>> 3)) >>> 0, i);
    const data = zip.writeZip([{ name: 'Big.md', data: '# Big\n\n큰 ZIP 안의 문서\n' }, { name: 'filler.bin', data: filler }]);
    expect(data.length).toBeGreaterThan(4 * MB);
    const up = await uploadLarge('big.zip', data);
    const r = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name: 'big.zip', url: up.url }] }, kim);
    expect({ status: r.status, message: (r.body as any)?.message, pages: (r.body as any)?.pages }).toMatchSnapshot();
  });
});
