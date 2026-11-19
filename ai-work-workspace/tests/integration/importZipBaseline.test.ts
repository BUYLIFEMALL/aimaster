// 작은 ZIP(50MiB 이하) 가져오기의 「지금 동작」 고정 시험 — WS-20261119-02, 플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §12-1.
// 큰 ZIP 경로를 만들기 전에 기존 경로(importFiles → zipSpecs → readZip)의 결과를 스냅숏으로 굳혀 둔다.
// 구현 뒤 이 파일과 스냅숏을 한 줄도 고치지 않고 통과해야 한다(고쳐야 하면 회귀).
// 로컬 Postgres만 쓴다. 공유 DB를 쓰지 않도록 AWW_LOCAL_ADMIN_URL·AWW_LOCAL_APP_URL로 전용 fixture를 넘겨 실행한다.
import { beforeAll, describe, expect, it } from 'vitest';
import { setupLocalDb } from '../setup-local-db.mjs';

process.env.AWW_DATABASE_URL = await setupLocalDb({ reset: true });

let runtime: typeof import('../../src/server/runtime');
let db: typeof import('../../src/litpage/server/db.ts');
let files: typeof import('../../src/litpage/server/content/files.ts');
let zip: typeof import('../../src/litpage/server/content/zip.ts');

const zoe = { id: '88888888-8888-4888-8888-888888888888', email: 'zip-zoe@example.com', name: '조이' };
const yan = { id: '99999999-9999-4999-8999-999999999999', email: 'zip-yan@example.com', name: '얀' };
let spaceId = '';
let yanSpaceId = '';

beforeAll(async () => {
  runtime = await import('../../src/server/runtime');
  db = await import('../../src/litpage/server/db.ts');
  files = await import('../../src/litpage/server/content/files.ts');
  zip = await import('../../src/litpage/server/content/zip.ts');
  for (const m of [zoe, yan]) await runtime.runRpc('loadAccountData', {}, m);
  const r = await runtime.runRpc('createWorkspace', { name: 'ZIP 시험' }, zoe);
  expect(r.status).toBe(200);
  spaceId = (r.body as any).spaceId ?? (r.body as any).space?.id ?? (r.body as any).id;
  expect(spaceId).toBeTruthy();
  const y = await runtime.runRpc('createWorkspace', { name: '얀 팀' }, yan);
  yanSpaceId = (y.body as any).spaceId ?? (y.body as any).space?.id ?? (y.body as any).id;
  expect(yanSpaceId).toBeTruthy();
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const H1 = '0123456789abcdef0123456789abcdef';
const H2 = 'fedcba9876543210fedcba9876543210';
const H3 = 'aaaabbbbccccddddeeeeffff00001111';
const enc = (s: string) => encodeURIComponent(s);
const html = (title: string, body: string) => `<html><head><meta charset="utf-8"><title>${title}</title></head><body><article><header><h1 class="page-title">${title}</h1></header><div class="page-body">${body}</div></article></body></html>`;

type E = { name: string; data: Buffer | string };

/** 표본 1 — 노션 페이지 내보내기 모양: 페이지 + 그림 + 하위 페이지(링크됨) + 링크 안 된 하위 페이지 */
const notionExport = (): E[] => [
  { name: `Project ${H1}.html`, data: html('Project', `<p>본문 <strong>굵게</strong> <a href="https://example.com/x">바깥 링크</a></p><figure class="image"><a href="${enc(`Project ${H1}`)}/cover.png"><img src="${enc(`Project ${H1}`)}/cover.png"/></a></figure><p><a href="${enc(`Project ${H1}`)}/${enc(`Sub ${H2}`)}.html">하위 문서</a></p><ul><li>목록 하나</li><li>목록 둘</li></ul>`) },
  { name: `Project ${H1}/cover.png`, data: PNG },
  { name: `Project ${H1}/Sub ${H2}.html`, data: html('Sub', `<h2>소제목</h2><p>하위 본문</p><figure class="image"><img src="${enc(`Sub ${H2}`)}/deep.png"/></figure>`) },
  { name: `Project ${H1}/Sub ${H2}/deep.png`, data: PNG },
  { name: `Project ${H1}/Loose ${H3}.md`, data: '# Loose\n\n링크되지 않은 하위 문서\n\n![그림](missing.png)\n' },
  { name: `Project ${H1}/video.mp4`, data: Buffer.from('not really a video') },
];

/** 표본 3 — Markdown + CSV 데이터베이스(행 페이지 포함) */
const markdownCsv = (): E[] => [
  { name: 'Notes.md', data: '# Notes\n\n첫 문단\n\n- [ ] 할 일\n- [x] 한 일\n\n```js\nconst a = 1;\n```\n\n[표](Tasks.csv)\n' },
  { name: 'Tasks.csv', data: 'Name,Status,Due\nAlpha,Done,2026-01-02\nBeta,Todo,\n' },
  { name: `Tasks/Alpha ${H1}.md`, data: '# Alpha\n\nStatus: Done\n\n알파 본문\n' },
];

/** 표본 4 — 한글 파일명(퍼센트 인코딩 참조) */
const korean = (): E[] => [
  { name: `회의록 ${H1}.html`, data: html('회의록', `<p>안건</p><figure class="image"><img src="${enc(`회의록 ${H1}`)}/${enc('화면 캡처.png')}"/></figure><p><a href="${enc(`회의록 ${H1}`)}/${enc(`결정 사항 ${H2}`)}.html">결정 사항</a></p>`) },
  { name: `회의록 ${H1}/화면 캡처.png`, data: PNG },
  { name: `회의록 ${H1}/결정 사항 ${H2}.html`, data: html('결정 사항', '<p>확정</p>') },
];

/** 표본 5 — 같은 이름이 두 번 들어 있는 ZIP */
const duplicates = (): E[] => [
  { name: 'Dup.md', data: '# First\n\n첫 번째 내용\n' },
  { name: 'Dup.md', data: '# Second\n\n두 번째 내용\n' },
  { name: 'Other.md', data: '# Other\n\n![a](pic.png)\n' },
  { name: 'pic.png', data: PNG },
  { name: 'pic.png', data: Buffer.concat([PNG, Buffer.from([9])]) },
];

/** 표본 6 — 숨김 파일·맥 찌꺼기·페이지 파일 없는 폴더·한 겹 공통 폴더 */
const messy = (): E[] => [
  { name: 'Top/.hidden.md', data: '# Hidden\n' },
  { name: 'Top/__MACOSX/._Page.md', data: 'junk' },
  { name: '__MACOSX/Top/._Page.md', data: 'junk' },
  { name: 'Top/.DS_Store', data: 'junk' },
  { name: 'Top/Page.md', data: '# Page\n\n본문 ![x](assets/a.png) [문서](Folder/Inner.md)\n' },
  { name: 'Top/assets/a.png', data: PNG },
  { name: 'Top/Folder/Inner.md', data: '# Inner\n\n안쪽\n' },
  { name: 'Top/Folder/Second.txt', data: '첫 줄\n둘째 줄\n\n다음 문단\n' },
  { name: 'Top/Empty/', data: '' },
  { name: 'Top\\Back\\Slash.md', data: '# Slash\n' },
  { name: 'Top/a/../Dots.md', data: '# Dots\n' },
];

const upload = (member: typeof zoe, name: string, data: Buffer) => db.withRequestCache(() => files.storeFile(name, data, member.id, spaceId, 'application/zip'));
const importZip = async (member: typeof zoe, name: string, data: Buffer, as = member) => {
  const up = upload(member, name, data);
  return runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [{ name, url: up.url }] }, as);
};

/** 결과 recordMap을 id·시각 없는 트리로 바꾼다(그림 주소는 파일 이름만 남김) */
function treeOf(body: any) {
  const table = (t: string) => Object.fromEntries(Object.entries(body.recordMap?.[t] ?? {}).map(([id, v]: [string, any]) => [id, v?.value?.value ?? v?.value ?? v]));
  const blocks = table('block') as Record<string, any>;
  const cols = table('collection') as Record<string, any>;
  const scrub = (v: unknown) => v === undefined ? undefined : JSON.parse(JSON.stringify(v)
    .replace(/\/files\/[0-9a-f-]{36}\//g, '/files/*/')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<id>')
    .replace(/\/[0-9a-f]{32}\b/g, '/<page>'));
  const images: string[] = [];
  const node = (id: string): unknown => {
    const b = blocks[id];
    if (!b) return { missing: true };
    const props = scrub(b.properties);
    const src = JSON.stringify(props ?? {}).match(/\/files\/\*\/[^"\\]+/g);
    if (src) images.push(...src);
    const out: Record<string, unknown> = { type: b.type };
    if (props) out.properties = props;
    if (b.format && Object.keys(b.format).length) out.format = scrub(b.format);
    if (b.collection_id) {
      const c = cols[b.collection_id];
      const rows = Object.values(blocks).filter((r: any) => r.parent_table === 'collection' && r.parent_id === b.collection_id);
      out.collection = {
        name: scrub(c?.name),
        schema: Object.values(c?.schema ?? {}).map((p: any) => `${p.name}:${p.type}`).sort(),
        rows: rows.map((r: any) => ({ title: (r.properties?.title ?? []).map((d: any) => d[0]).join(''), children: (r.content ?? []).map(node) })).sort((a, z) => a.title.localeCompare(z.title)),
      };
    }
    if (b.content?.length) out.children = b.content.map(node);
    return out;
  };
  const roots = (body.pageIds as string[]).map(node);
  return { pages: body.pages, databases: body.databases, roots, images: images.sort() };
}

describe('작은 ZIP 가져오기 — 지금 동작 고정', () => {
  const cases: [string, () => E[]][] = [
    ['노션 페이지 내보내기(그림·하위 페이지)', notionExport],
    ['Markdown + CSV 데이터베이스', markdownCsv],
    ['한글 파일명', korean],
    ['같은 이름 중복', duplicates],
    ['숨김 파일·빈 폴더·공통 폴더', messy],
  ];
  for (const [label, make] of cases) {
    it(label, async () => {
      const r = await importZip(zoe, 'sample.zip', zip.writeZip(make()));
      expect(r.status).toBe(200);
      expect(treeOf(r.body)).toMatchSnapshot();
    });
  }

  it('Export-….zip이 한 번 겹친 ZIP', async () => {
    const inner = zip.writeZip(notionExport());
    const r = await importZip(zoe, 'outer.zip', zip.writeZip([{ name: 'Export-1234.zip', data: inner }]));
    expect(r.status).toBe(200);
    const nested = treeOf(r.body);
    expect(nested).toMatchSnapshot();
    // 겹친 ZIP의 결과는 풀어서 넣은 것과 같다
    const flat = await importZip(zoe, 'flat.zip', zip.writeZip(notionExport()));
    expect(nested).toEqual(treeOf(flat.body));
  });

  it('그림은 쓰인 것만 저장되고 그림이 아닌 첨부는 저장되지 않는다', async () => {
    const before = db.withRequestCache(() => (db.db.prepare('SELECT COUNT(*) AS n FROM files WHERE user_id = ?').get(zoe.id) as { n: number }).n);
    const r = await importZip(zoe, 'count.zip', zip.writeZip(notionExport()));
    expect(r.status).toBe(200);
    const rows = db.withRequestCache(() => db.db.prepare('SELECT name, mime, size FROM files WHERE user_id = ? ORDER BY created_time DESC, name LIMIT ?').all(zoe.id, 3) as { name: string; mime: string; size: number }[]);
    const after = db.withRequestCache(() => (db.db.prepare('SELECT COUNT(*) AS n FROM files WHERE user_id = ?').get(zoe.id) as { n: number }).n);
    // 올린 ZIP 1 + 그림 2(cover.png, deep.png). video.mp4와 본문에 없는 missing.png는 없다
    expect(after - before).toBe(3);
    expect(rows.map((x) => `${x.name}|${x.mime}|${x.size}`).sort()).toMatchSnapshot();
  });

  describe('오류 문구', () => {
    const fail = async (name: string, data: Buffer, as = zoe, owner = zoe) => {
      const r = await importZip(owner, name, data, as);
      return { status: r.status, message: (r.body as any)?.message };
    };
    it('ZIP이 아닌 파일', async () => expect(await fail('broken.zip', Buffer.from('this is not a zip archive at all'))).toMatchSnapshot());
    it('페이지로 만들 파일이 없음', async () => expect(await fail('images.zip', zip.writeZip([{ name: 'a.png', data: PNG }, { name: 'b.mp4', data: 'x' }]))).toMatchSnapshot());
    it('항목 5,000개 초과', async () => {
      const many: E[] = Array.from({ length: 5001 }, (_, i) => ({ name: `n/${i}.txt`, data: '' }));
      expect(await fail('many.zip', zip.writeZip(many))).toMatchSnapshot();
    });
    it('풀린 크기 256MiB 초과', async () => {
      expect(await fail('bomb.zip', zip.writeZip([{ name: 'big.md', data: Buffer.alloc(257 * 1024 * 1024, 0x20) }]))).toMatchSnapshot();
    });
    it('다른 회원이 올린 ZIP은 가져올 수 없다', async () => {
      const up = upload(zoe, 'theirs.zip', zip.writeZip(markdownCsv()));
      const r = await runtime.runRpc('importFiles', { spaceId: yanSpaceId, parent: { kind: 'private' }, files: [{ name: 'theirs.zip', url: up.url }] }, yan);
      expect({ status: r.status, message: (r.body as any)?.message }).toMatchSnapshot();
    });
    it('구성원이 아닌 워크스페이스로는 가져올 수 없다', async () => expect(await fail('theirs.zip', zip.writeZip(markdownCsv()), yan, zoe)).toMatchSnapshot());
    it('파일 없이 부름', async () => {
      const r = await runtime.runRpc('importFiles', { spaceId, parent: { kind: 'private' }, files: [] }, zoe);
      expect({ status: r.status, message: (r.body as any)?.message }).toMatchSnapshot();
    });
  });
});

describe('readZip — 지금 동작 고정', () => {
  it('이름 정규화: 역슬래시·빈 조각·점·점점·폴더·맥 찌꺼기', () => {
    const names = ['a\\b\\c.md', 'x//y.md', './z.md', 'p/../q.md', '../../r.md', 'dir/', '__MACOSX/a.md', 'd/.DS_Store', 'sub/__MACOSX/keep.md', '.hidden', '한글/파일.md'];
    const out = zip.readZip(zip.writeZip(names.map((name) => ({ name, data: 'x' }))));
    expect(out.map((e) => e.name)).toMatchSnapshot();
  });
  it('한도: 항목 수·풀린 크기·겹친 ZIP이 같은 예산을 쓴다', () => {
    const z = zip.writeZip([{ name: 'a.txt', data: 'aaaa' }, { name: 'b.txt', data: 'bbbb' }]);
    expect(() => zip.readZip(z, { maxEntries: 1 })).toThrow('Too many files in archive');
    expect(() => zip.readZip(z, { maxTotalBytes: 7 })).toThrow('Archive too large');
    const budget = { bytes: 100, entries: 10 };
    zip.readZip(z, { budget });
    expect(budget).toEqual({ bytes: 92, entries: 8 });
    expect(() => zip.readZip(Buffer.from('nope'))).toThrow('Not a zip archive');
  });
});
