// Import (Settings › Import, page ••• › Import, slash /import /csv /pdf …): uploaded files → pages / databases.
//   importFiles { spaceId, parent: { kind: 'private' } | { kind: 'page', pageId, afterBlockId? }, files: [{ name, url }],
//                 csvTypes?: { [columnIndex]: propertyType | 'skip' } }
//     → { pageIds: string[], pages: number, databases: number }
//   previewCsv { url, blockId? }  → columns (name, inferred type, samples) + the target database's properties
//   mergeCsv { blockId, url, mapping?: { [columnIndex]: propertyId | 'new' | 'skip' } }   "Merge with CSV" :
//   (third-party tiles import those apps' export files: Evernote .enex, Trello .json, Asana/Jira/Monday CSV or Excel,
//    Confluence HTML ZIP, Quip/Google Docs .docx/.html, Workflowy .opml/.txt)
//     rows are added to an existing database (columns matched to properties by name; unmatched become Text)
// Supported: Text & Markdown (.md .markdown .txt), CSV / TSV / Excel (.xlsx) → full-page database, HTML (.html .htm),
// Word (.docx), PDF (text layer), OPML outlines, ZIP (the export tree of Markdown/HTML/CSV + images, and any of
// the formats above inside it). Limits : 5 MB per file on Free, 50 MB on paid plans (PDF 20 MB); 120 files
// per 12 hours per user.
import { compactId, newId } from '#shared/ids.ts';
import type { Operation } from '#shared/ops.ts';
import { roleAtLeast } from '#shared/permissions.ts';
import type { BaseRecord, BlockRecord, CollectionRecord, PropertyType, RecordMap, SpaceRecord, SpaceViewRecord, Table, UserRootRecord } from '#shared/records.ts';
import { db, getRecord, lockRecords, tx, withoutRequestCache } from '../../db.ts';
import { ApiError, type Ctx } from '../handlers.ts';
import { RecordMapBuilder, applyTransactions, blockRole } from '../../records.ts';
import { OpsBuilder, encodeRowValue, shortPropId, type Spec } from '../../content/spec.ts';
import { parseMarkdown } from '../../content/markdown.ts';
import { parseHtml } from '../../content/html.ts';
import { CSV_COLUMN_TYPES, csvToDb, inferColumnType, parseCsv, parseDateCell, rowsToDb } from '../../content/csv.ts';
import { readZip, type ZipEntry } from '../../content/zip.ts';
import { fileIdFromUrl, fileRow, readStoredFile, storeFile, mimeFor } from '../../content/files.ts';
import { docxToSpecs } from '../../content/docx.ts';
import { pdfToSpecs } from '../../content/pdf.ts';
import { opmlToSpecs, tsvToRows, xlsxToRows } from '../../content/sheets.ts';
import { enexToDb, trelloToDb } from '../../content/apps.ts';
import { hit, RateLimitError } from '../../ratelimit.ts';
import { ZIP_IMAGE_EXT, ZIP_IMPORT_LIMITS, ZIP_PAGE_EXT, normalizeZipName, slashZipName, zipNameHidden, zipNameSkipped, zipPathTooLong } from '#shared/zipPath.ts';

type Handler = (ctx: Ctx, body: any) => any;

// 이식판 2026-11-19(WS-20261119-02): 큰 ZIP 가져오기 작업(플랜 docs/PLAN_20261119_LARGE_ZIP_IMPORT.md §9).
// 50MiB를 넘는 ZIP은 브라우저가 그림을 하나씩 Storage로 올리고(src/server/fileStorage.ts importJobStep), 여기에는
// 글 파일 묶음(작은 ZIP)과 「ZIP 안 경로 → 올린 파일 id」 표만 온다. 작업 줄과 files.import_job_id로
// 「이 작업에서 이 회원이 올린 파일」만 쓰이게 한다. state: open → done → closed, 또는 cancelled.
db.exec(`
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  state TEXT NOT NULL,
  declared_files INTEGER NOT NULL,
  declared_bytes INTEGER NOT NULL,
  files INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  created_time INTEGER NOT NULL,
  result TEXT
);
CREATE INDEX IF NOT EXISTS import_jobs_user ON import_jobs (user_id, state);
`);
// 한 회원에 열린(open) 작업은 하나 — 동시에 두 번 시작해도 DB가 두 번째를 막는다(부분 고유 색인)
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS import_jobs_one_open ON import_jobs (user_id) WHERE state = 'open'");
try {
  db.exec('ALTER TABLE files ADD COLUMN import_job_id TEXT');
} catch {
  /* column exists */
}
db.exec('CREATE INDEX IF NOT EXISTS files_import_job ON files (import_job_id)');
// 글 파일 묶음(ZIP)도 그 작업에서 올린 파일 하나로 묶는다 — 가져오기는 이 id만 글 묶음으로 받는다
try {
  db.exec('ALTER TABLE import_jobs ADD COLUMN pages_file_id TEXT');
} catch {
  /* column exists */
}
const JOB_TTL_MS = 24 * 3_600_000;

const MAX_FILES = 20;
const MAX_BLOCKS = 20_000;
/** 2026-11-19(WS-20261119-03): importFiles 응답에 바뀐 레코드를 모두 싣는 상한. 이보다 많이 바뀌면 뿌리 페이지 범위만 싣는다.
 *  (문서가 많은 ZIP에서 응답이 수 MB가 되어 서버리스 응답 한도를 넘는다 — 201쪽·약 4,800블록에서 3.6MB 측정) */
const FULL_RECORD_MAP_MAX = 1000;
/** 2026-11-19(WS-20261119-03 응답 바이트): importFiles 응답 본문(UTF-8 JSON 전체 — 봉투·포인터 목록 포함)의 상한.
 *  서버리스 응답 한도는 4.5MB다. 개수 기준(FULL_RECORD_MAP_MAX)만으로는 레코드가 큰 가져오기를 막지 못한다. */
export const IMPORT_RESPONSE_BUDGET = 3_000_000;
const jsonBytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v));

type ImportChange = { table: Table; record: BaseRecord };
export type ImportPointer = { table: string; id: string };

/**
 * importFiles 응답 본문을 만든다. 저장은 이미 끝난 뒤이며, 여기서는 화면에 무엇을 실어 보낼지만 정한다(어느 단계든 DB에는 전부 있다).
 *  1) 전체: 바뀐 레코드가 FULL_RECORD_MAP_MAX 이하이고 본문이 예산 이하 — 예전 그대로 모두 싣는다.
 *  2) partial: 화면이 바로 쓰는 것만 — 블록이 아닌 레코드(사이드바 목록 등), 넣은 자리의 부모, 뿌리 페이지, 뿌리의 컬렉션·보기.
 *     나머지 본문은 화면이 페이지를 열 때 loadPage·getSidebarChildren으로 읽는다.
 *  3) partial도 예산을 넘으면: 위 순서대로 들어가는 것만 싣고, 못 실은 레코드는 버리지 않고 `pending` 포인터로 돌려준다
 *     (화면이 fetchRecords로 따로 받는다). 불변식: partial 집합의 레코드는 recordMap 또는 pending 중 정확히 한 곳에 있다.
 *     포인터 목록조차 예산을 넘으면 들어가는 만큼만 싣고 남은 수를 `pendingOmitted`로 알린다(화면은 새로 고침을 안내).
 * 크기는 어림(실제 직렬화보다 작지 않게 잡은 상한)으로 쌓아 가므로 본문은 예산을 넘지 않는다. 같은 입력이면 결과가 같다.
 */
export function buildImportResponse<B extends { pageIds: string[] }>(uid: string, base: B, changes: ImportChange[], target: { table: string; id: string }, budget = IMPORT_RESPONSE_BUDGET) {
  if (changes.length <= FULL_RECORD_MAP_MAX) {
    const rm = new RecordMapBuilder(uid);
    for (const ch of changes) rm.add(ch.table, ch.record);
    const body = { ...base, recordMap: rm.map };
    if (jsonBytes(body) <= budget) return body;
  }
  const rootAt = new Map(base.pageIds.map((id, i) => [id, i] as const));
  const collections = new Set<string>();
  const views = new Set<string>();
  for (const ch of changes) {
    if (ch.table !== 'block' || !rootAt.has(ch.record.id)) continue;
    const b = ch.record as BlockRecord;
    if (b.collection_id) collections.add(b.collection_id);
    for (const v of b.view_ids ?? []) views.add(v);
  }
  // 순위: 0 블록이 아닌 레코드 → 1 넣은 자리의 부모 → 2 뿌리(가져온 순서) → 3 뿌리의 컬렉션 → 4 그 보기. -1은 싣지 않는 본문
  const rank = (ch: ImportChange) => {
    if (ch.table === 'block') return target.table === 'block' && ch.record.id === target.id ? 1 : rootAt.has(ch.record.id) ? 2 : -1;
    if (ch.table === 'collection') return collections.has(ch.record.id) ? 3 : -1;
    if (ch.table === 'collection_view') return views.has(ch.record.id) ? 4 : -1;
    return 0;
  };
  const all = new RecordMapBuilder(uid);
  const items: { table: Table; id: string; entry: unknown; record: number; pointer: number }[] = [];
  changes
    .map((ch, i) => ({ ch, i, r: rank(ch) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || (a.r === 2 ? rootAt.get(a.ch.record.id)! - rootAt.get(b.ch.record.id)! : a.i - b.i))
    .forEach(({ ch }) => {
      all.add(ch.table, ch.record);
      const entry = (all.map as any)[ch.table]?.[ch.record.id];
      if (!entry) return; // 이 사용자가 볼 수 없는 레코드는 예전에도 싣지 않았다
      items.push({ table: ch.table, id: ch.record.id, entry, record: jsonBytes(ch.record.id) + jsonBytes(entry) + 2, pointer: jsonBytes({ table: ch.table, id: ch.record.id }) + 1 });
    });
  const map: RecordMap = { __version__: 3 };
  const pending: ImportPointer[] = [];
  // 고정 비용: 모든 선택 칸이 다 붙은 빈 본문 + 표 이름 칸
  let used = jsonBytes({ ...base, recordMap: map, partial: true, pending: [], pendingOmitted: 2 ** 31 });
  for (const t of new Set(items.map((x) => x.table))) used += jsonBytes(t) + 4;
  const pointers = items.reduce((n, x) => n + x.pointer, 0);
  if (used + pointers > budget) {
    // 포인터 목록만으로도 넘는다: 들어가는 만큼만(순서대로) 싣고 나머지는 수만 알린다
    let omitted = 0;
    for (const x of items) {
      if (!omitted && used + x.pointer <= budget) {
        pending.push({ table: x.table, id: x.id });
        used += x.pointer;
      } else omitted++;
    }
    return { ...base, recordMap: map, partial: true as const, pending, pendingOmitted: omitted };
  }
  used += pointers;
  for (const x of items) {
    if (used - x.pointer + x.record <= budget) {
      ((map as any)[x.table] ??= {})[x.id] = x.entry;
      used += x.record - x.pointer;
    } else pending.push({ table: x.table, id: x.id });
  }
  return { ...base, recordMap: map, partial: true as const, ...(pending.length ? { pending } : {}) };
}
const PAGE_EXT = ZIP_PAGE_EXT;
/** File types importFiles accepts directly (ZIP aside): + Evernote .enex and Trello board .json exports. */
export const IMPORT_EXT = /\.(md|markdown|txt|csv|tsv|html?|docx|pdf|xlsx|opml|enex|json)$/i;
const MB = 1024 * 1024;
const IMAGE_EXT = ZIP_IMAGE_EXT;

function requireUser(ctx: Ctx): string {
  if (!ctx.userId) throw new ApiError('Unauthorized', 401);
  return ctx.userId;
}

function spaceViewOf(userId: string, spaceId: string): SpaceViewRecord | undefined {
  const root = getRecord<UserRootRecord>('user_root', userId);
  for (const id of root?.space_views ?? []) {
    const sv = getRecord<SpaceViewRecord>('space_view', id);
    if (sv?.space_id === spaceId && sv.alive !== false) return sv;
  }
  return undefined;
}

/** "Meeting notes 1a2b…(32 hex).md" → "Meeting notes" */
export function titleFromFileName(name: string): string {
  const base = name.split('/').pop()!.replace(/\.[^.]+$/, '');
  return base.replace(/\s+[0-9a-f]{32}$/i, '').replace(/_all$/, '').trim() || 'Untitled';
}

function decodeText(buf: Buffer): string {
  // UTF-8 (with BOM) or UTF-16LE
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString('utf16le');
  return buf.toString('utf8').replace(/^﻿/, '');
}

function pageFromText(name: string, text: string, ctx: Parameters<typeof parseMarkdown>[1] = {}, csvTypes?: Record<number, PropertyType | 'skip'>): Spec {
  const ext = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase() ?? 'md';
  if (ext === 'csv') return { type: 'collection_view_page', db: csvToDb(titleFromFileName(name), text, csvTypes), icon: undefined };
  if (ext === 'tsv') return { type: 'collection_view_page', db: rowsToDb(titleFromFileName(name), tsvToRows(text), csvTypes) };
  if (ext === 'opml') {
    const r = opmlToSpecs(text);
    return { type: 'page', text: r.title ?? titleFromFileName(name), children: r.blocks };
  }
  if (ext === 'html' || ext === 'htm') {
    const r = parseHtml(text, ctx);
    return { type: 'page', text: r.title ?? titleFromFileName(name), children: r.blocks };
  }
  if (ext === 'txt') {
    // plain text: paragraphs separated by blank lines, line breaks kept
    const paras = text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((p) => p.replace(/\s+$/, '')).filter((p) => p.trim());
    return { type: 'page', text: titleFromFileName(name), children: paras.map((p) => ({ type: 'text', text: p })) };
  }
  const r = parseMarkdown(text, ctx);
  return { type: 'page', text: r.title ?? titleFromFileName(name), children: r.blocks };
}

/** Any supported file (binary formats included) → a page / database spec. */
function pageFromFile(name: string, data: Buffer, uid: string, spaceId: string, ctx: Parameters<typeof parseMarkdown>[1] = {}, csvTypes?: Record<number, PropertyType | 'skip'>): Spec {
  const ext = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase() ?? '';
  try {
    if (ext === 'docx') {
      const r = docxToSpecs(data, { title: titleFromFileName(name), storeImage: (img, bytes) => storeFile(img, bytes, uid, spaceId, mimeFor(img)).url });
      return { type: 'page', text: r.title, children: r.blocks };
    }
    if (ext === 'pdf') {
      const r = pdfToSpecs(data, { title: titleFromFileName(name) });
      return { type: 'page', text: r.title, children: r.blocks };
    }
    if (ext === 'xlsx') return { type: 'collection_view_page', db: rowsToDb(titleFromFileName(name), xlsxToRows(data), csvTypes) };
    if (ext === 'enex') return { type: 'collection_view_page', db: enexToDb(titleFromFileName(name), decodeText(data)) };
    if (ext === 'json') return { type: 'collection_view_page', db: trelloToDb(titleFromFileName(name), decodeText(data)) };
  } catch (e) {
    throw new ApiError(`${name.split('/').pop()}: ${(e as Error).message}`, 400);
  }
  return pageFromText(name, decodeText(data), ctx, csvTypes);
}

/** Per-file size limit : Free 5 MB, paid plans 50 MB (PDF 20 MB). */
function maxBytesFor(space: SpaceRecord, name: string): number {
  if (space.plan_type === 'free') return 5 * MB;
  return /\.pdf$/i.test(name) ? 20 * MB : 50 * MB;
}

// ---------------- ZIP (the export layout)

/** 큰 ZIP 작업에서 이미 Storage에 올라간 그림: ZIP 항목 자리에 내용 없이 주소만 들어간다 */
interface AssetEntry extends ZipEntry {
  url?: string;
  fileId?: string;
}

interface ZipCtx {
  entries: Map<string, AssetEntry>;
  /** 실제로 본문에 쓰인 올린 그림(파일 id) — 작업을 마무리할 때 쓰이지 않은 것만 지운다 */
  usedAssets: Set<string>;
  ids: Map<string, string>;
  consumed: Set<string>;
  uid: string;
  spaceId: string;
  storedImages: Map<string, string>;
}

function dirOf(path: string) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i + 1);
}

function resolveRel(fromDir: string, href: string): string | null {
  let h = href.split('#')[0].split('?')[0];
  if (!h || /^[a-z]+:/i.test(h) || h.startsWith('/')) return null;
  try {
    h = decodeURIComponent(h);
  } catch {
    /* keep raw */
  }
  const parts = (fromDir + h).split('/');
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

function zipPageSpec(path: string, z: ZipCtx): Spec {
  z.consumed.add(path);
  const entry = z.entries.get(path)!;
  const dir = dirOf(path);
  const base = path.slice(dir.length).replace(/\.[^.]+$/, '');
  const childDir = `${dir}${base}/`;
  const id = z.ids.get(path)!;
  const ctx = {
    resolveImage: (src: string) => {
      const p = resolveRel(dir, src);
      if (!p) return /^https?:/i.test(src) ? src : null;
      const e = z.entries.get(p);
      if (!e || !IMAGE_EXT.test(p)) return null;
      if (e.url) {
        if (e.fileId) z.usedAssets.add(e.fileId);
        return e.url;
      }
      if (!z.storedImages.has(p)) z.storedImages.set(p, storeFile(p.split('/').pop()!, e.data, z.uid, z.spaceId, mimeFor(p)).url);
      return z.storedImages.get(p)!;
    },
    resolvePageLink: (href: string) => {
      const p = resolveRel(dir, href);
      if (!p || !z.entries.has(p) || !PAGE_EXT.test(p) || z.consumed.has(p)) return null;
      // only sub-pages (inside this page's folder) are embedded where the link appears
      if (!p.startsWith(childDir)) return null;
      return zipPageSpec(p, z);
    },
    resolveLink: (href: string) => {
      const p = resolveRel(dir, href);
      if (p && z.ids.has(p)) return `/${compactId(z.ids.get(p)!)}`;
      return /^(https?:|mailto:)/i.test(href) ? href : null;
    },
  };
  const text = decodeText(entry.data);
  let spec: Spec;
  if (/\.csv$/i.test(path)) {
    const db = csvToDb(titleFromFileName(path), text);
    // row pages exported next to the CSV ("<db>/<row title> <id>.md") become row content
    for (const row of db.rows) {
      const title = String(row.values.title ?? '');
      const match = [...z.entries.keys()].find((k) => dirOf(k) === childDir && /\.(md|html?)$/i.test(k) && !z.consumed.has(k) && titleFromFileName(k) === title);
      if (match) {
        z.consumed.add(match);
        const rowSpec = pageFromText(match, decodeText(z.entries.get(match)!.data), ctx);
        // row exports start with "Prop: value" lines; drop the ones matching columns
        row.children = (rowSpec.children ?? []).filter((c) => !(c.type === 'text' && typeof c.text !== 'string' && /^[^:\n]{1,40}: .*/.test((c.text ?? []).map((d) => d[0]).join('')) && (c.text ?? []).length <= 2));
      }
    }
    spec = { type: 'collection_view_page', db, id };
  } else {
    spec = /\.(docx|pdf|xlsx)$/i.test(path) ? pageFromFile(path, entry.data, z.uid, z.spaceId, ctx) : pageFromText(path, text, ctx);
    spec.id = id;
  }
  // sub-pages not linked from the content are appended (they remain child pages)
  if (spec.type === 'page') {
    const rest = [...z.entries.keys()].filter((k) => dirOf(k) === childDir && PAGE_EXT.test(k) && !z.consumed.has(k)).sort();
    const preferAll = new Set(rest.filter((k) => /_all\.csv$/i.test(k)).map((k) => k.replace(/_all\.csv$/i, '.csv')));
    for (const k of rest) {
      if (preferAll.has(k) || z.consumed.has(k)) continue;
      spec.children = [...(spec.children ?? []), zipPageSpec(k, z)];
    }
  }
  return spec;
}

function zipSpecs(buf: Buffer, uid: string, spaceId: string, zipName: string, assets: AssetEntry[] = [], usedAssets: Set<string> = new Set()): Spec[] {
  // one decompression budget for the archive and the archives nested in it (zip bombs)
  const budget = { bytes: 256 * 1024 * 1024, entries: 5000 };
  let entries: AssetEntry[];
  try {
    entries = readZip(buf, { budget }).filter((e) => !/(^|\/)\./.test(e.name));
    // nested zips (exports wrap "Export-….zip" inside) — unpack one level
    const inner = entries.filter((e) => /\.zip$/i.test(e.name));
    if (inner.length && entries.every((e) => /\.zip$/i.test(e.name) || !PAGE_EXT.test(e.name))) entries = inner.flatMap((e) => readZip(e.data, { budget }));
  } catch (e) {
    throw new ApiError(`${zipName}: ${(e as Error).message}`, 400);
  }
  // 큰 ZIP 작업: 따로 올라간 그림을 원래 자리의 항목으로 끼워 넣는다(공통 폴더 판단·경로 풀이가 통째로 올렸을 때와 같아지도록).
  if (assets.length) {
    const names = new Set(entries.map((e) => e.name));
    for (const a of assets) if (names.has(a.name)) throw new ApiError(`${zipName}: ${a.name} is listed twice`, 400);
    if (entries.length + assets.length > ZIP_IMPORT_LIMITS.entries) throw new ApiError(`${zipName}: Too many files in archive`, 400);
    entries = [...entries, ...assets];
  }
  // strip a single shared top folder
  const tops = new Set(entries.map((e) => e.name.split('/')[0]));
  if (tops.size === 1 && entries.every((e) => e.name.includes('/'))) {
    const top = [...tops][0] + '/';
    entries = entries.map((e) => ({ ...e, name: e.name.slice(top.length) }));
  }
  const z: ZipCtx = { entries: new Map(entries.map((e) => [e.name, e])), usedAssets, ids: new Map(), consumed: new Set(), uid, spaceId, storedImages: new Map() };
  for (const k of z.entries.keys()) if (PAGE_EXT.test(k)) z.ids.set(k, newId());
  const specs: Spec[] = [];
  const roots = [...z.entries.keys()].filter((k) => PAGE_EXT.test(k) && dirOf(k) === '').sort();
  const preferAll = new Set(roots.filter((k) => /_all\.csv$/i.test(k)).map((k) => k.replace(/_all\.csv$/i, '.csv')));
  for (const k of roots) if (!z.consumed.has(k) && !preferAll.has(k)) specs.push(zipPageSpec(k, z));
  // orphan folders (no page file for them) → a page per folder holding its files
  const leftovers = [...z.entries.keys()].filter((k) => PAGE_EXT.test(k) && !z.consumed.has(k));
  const byTopFolder = new Map<string, string[]>();
  for (const k of leftovers) {
    const top = k.split('/')[0];
    byTopFolder.set(top, [...(byTopFolder.get(top) ?? []), k]);
  }
  for (const [folder, files] of byTopFolder) {
    const children: Spec[] = [];
    for (const f of files.sort()) if (!z.consumed.has(f)) children.push(zipPageSpec(f, z));
    specs.push({ type: 'page', text: titleFromFileName(folder), children });
  }
  if (!specs.length) throw new ApiError(`No Markdown, HTML or CSV files found in ${zipName}`, 400);
  return specs;
}

function countPages(specs: Spec[]): { pages: number; databases: number } {
  let pages = 0;
  let databases = 0;
  const walk = (s: Spec) => {
    if (s.type === 'page') pages++;
    if (s.type === 'collection_view_page' || s.type === 'collection_view') {
      databases++;
      for (const r of s.db?.rows ?? []) for (const c of r.children ?? []) walk(c);
    }
    for (const c of s.children ?? []) walk(c);
  };
  specs.forEach(walk);
  return { pages, databases };
}

function spaceOrThrow(spaceId: unknown, uid: string): SpaceRecord {
  const space = getRecord<SpaceRecord>('space', String(spaceId ?? ''));
  if (!space || !space.permissions?.some((p) => p.type === 'user_permission' && p.user_id === uid && p.role !== 'none')) throw new ApiError('Not a member of this workspace', 403);
  return space;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** ZIP은 요금제별 파일 한도에서 빠지지만(예전 그대로) Storage에 둘 수 있는 크기까지만 읽는다 */
const STORED_ZIP_MAX = 50 * MB;

/**
 * 이식판 2026-11-19(WS-20261119-02): 4MiB를 넘어 Storage에 둔 올린 파일(files.storage_path, 내용은 DB에 없음)을 읽는다.
 * 예전에는 이런 파일을 읽지 못해 가져오기가 "Upload not found"로 끝났다. 부르는 명령이 워크스페이스·대상 권한·횟수 확인을 마친 뒤에만 부른다.
 * 확인: 파일 줄이 있고 · 올린 사람 본인 · 올리기를 끝냄(pending 0) · 경로가 `<본인>/<파일 id>/<이름>` 모양 · 기록된 크기가 한도 이하.
 * 내용은 요청 의존성(ctx.loadStoredUpload)으로만 읽고 어디에도 보관하지 않는다. 한 요청에서 같은 파일을 두 번 읽지 않는다.
 * 소유·완료·경로가 맞지 않으면 null(부르는 쪽이 예전과 같은 404를 낸다 — 남의 파일이 있는지 알려 주지 않는다).
 */
async function storedUpload(ref: string, name: string, uid: string, max: number, ctx: Ctx, seen: Set<string>): Promise<{ name: string; mime: string; data: Buffer } | null> {
  const id = fileIdFromUrl(ref) ?? (UUID.test(ref) ? ref : null);
  const row = id ? fileRow(id) : undefined;
  if (!row || !row.storage_path || row.pending || row.user_id !== uid) return null;
  const parts = row.storage_path.split('/');
  if (parts.length !== 3 || parts[0] !== uid || parts[1] !== row.id || !parts[2] || parts[2] === '.' || parts[2] === '..') return null;
  if (seen.has(row.id)) throw new ApiError(`${name}: the same file was added twice`, 400);
  seen.add(row.id);
  if (!(row.size > 0) || row.size > max) throw new ApiError(`${name} is larger than ${Math.round(max / MB)} MB`, 413);
  if (!ctx.loadStoredUpload) return null;
  if (!hit(`import-stored:${uid}`, 60, 10 * 60_000)) throw new RateLimitError('You’ve imported a lot of files recently. Try again in a few hours.');
  // 받는 바이트는 기록된 크기까지만(그보다 많이 오면 로더가 끊는다)
  const data = await ctx.loadStoredUpload({ id: row.id, storagePath: row.storage_path }, row.size);
  if (!data || data.length !== row.size) throw new ApiError(`${name}: 올린 파일을 읽지 못했습니다. 잠시 후 다시 시도하거나 파일을 다시 올려 주세요.`, 409);
  return { name: row.name, mime: row.mime, data };
}

/** The uploaded file a request names (only the uploader can import it). */
async function uploadOf(f: any, uid: string, space: SpaceRecord, ctx: Ctx, seen: Set<string> = new Set()) {
  const name = String(f?.name ?? 'Untitled').slice(0, 255);
  const ref = String(f?.url ?? f?.id ?? '');
  const max = maxBytesFor(space, name);
  const isZip = /\.zip$/i.test(name);
  const file = readStoredFile(ref, uid) ?? (await storedUpload(ref, name, uid, isZip ? STORED_ZIP_MAX : max, ctx, seen));
  if (!file) throw new ApiError(`Upload not found: ${name}`, 404);
  if (file.data.length > max && !isZip) throw new ApiError(`${name} is larger than ${Math.round(max / MB)} MB`, 413);
  return { name, file };
}

type ImportJob = { id: string; state: string; result: string | null; pagesFileId: string | null };
/** 같은 작업을 다른 요청이 먼저 끝냈음(이 요청이 만든 것은 트랜잭션과 함께 되돌린다) */
class JobTaken extends Error {}

/** 그 회원이 그 워크스페이스로 연 작업(남의 작업·없는 작업은 똑같이 404 — 있는지 알려 주지 않는다) */
function jobOrThrow(jobId: unknown, uid: string, spaceId: string): ImportJob {
  const row = typeof jobId === 'string' && UUID.test(jobId)
    ? (db.prepare('SELECT id, user_id, space_id, state, created_time, result, pages_file_id FROM import_jobs WHERE id = ?').get(jobId) as { id: string; user_id: string; space_id: string; state: string; created_time: number; result: string | null; pages_file_id: string | null } | undefined)
    : undefined;
  if (!row || row.user_id !== uid || row.space_id !== spaceId) throw new ApiError('Import job not found', 404);
  if (row.state === 'open' && Number(row.created_time) < Date.now() - JOB_TTL_MS) throw new ApiError('가져오기 작업이 만료됐습니다. 처음부터 다시 시작해 주세요.', 410);
  if (row.state !== 'open' && row.state !== 'done' && row.state !== 'closed') throw new ApiError('이미 취소된 가져오기 작업입니다.', 409);
  return { id: row.id, state: row.state, result: row.result, pagesFileId: row.pages_file_id };
}

/**
 * 큰 ZIP 작업의 글 파일 묶음: 요청이 가리키는 파일이 **이 작업에 글 묶음으로 등록된 그 파일**이어야 한다(플랜 §9-5).
 * 같은 회원의 다른 ZIP·다른 작업의 묶음·작업 밖에서 올린 파일을 이 작업에 붙일 수 없다. 워크스페이스도 작업과 같아야 한다.
 */
function assertJobPages(ref: unknown, job: ImportJob, uid: string, spaceId: string, zipName: string) {
  const s = String(ref ?? '');
  const id = fileIdFromUrl(s) ?? (UUID.test(s) ? s : null);
  const row = id ? (db.prepare('SELECT id, user_id, space_id, pending, import_job_id FROM files WHERE id = ?').get(id) as { id: string; user_id: string; space_id: string | null; pending: number; import_job_id: string | null } | undefined) : undefined;
  if (!id || !job.pagesFileId || id !== job.pagesFileId || !row || row.user_id !== uid || row.import_job_id !== job.id || row.space_id !== spaceId || Number(row.pending)) {
    throw new ApiError(`${zipName}: the pages file doesn’t belong to this import`, 400);
  }
}

/**
 * 「ZIP 안 경로 → 올린 파일 id」 표 검증(플랜 §9). 하나라도 어긋나면 전체 거절하고 페이지를 만들지 않는다.
 * · 값은 파일 id만 받는다(주소는 받지 않고 여기서 만든다).
 * · 파일마다: 줄이 있고 · 올린 사람 본인 · **이 작업**에서 올림 · 올리기를 끝냄 · 같은 워크스페이스 · Storage 경로가 `<본인>/<파일 id>/…`.
 * · 경로는 서버가 다시 정규화한다. 정규화 뒤 같은 경로가 둘이면 거절, 같은 파일을 두 경로에 쓰는 것도 거절.
 * · 그림만 받는다(가져오기가 ZIP에서 꺼내 쓰는 것은 그림뿐 — 통째로 올렸을 때와 같게).
 */
function jobAssets(raw: unknown, job: ImportJob, uid: string, spaceId: string, zipName: string): AssetEntry[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const pairs = Object.entries(raw as Record<string, unknown>);
  if (pairs.length > ZIP_IMPORT_LIMITS.entries) throw new ApiError(`${zipName}: Too many files in archive`, 400);
  // 이 작업에서 올리기를 끝낸 그림 수(글 묶음은 뺀다)
  const owned = Number((db.prepare('SELECT COUNT(*) AS n FROM files WHERE import_job_id = ? AND user_id = ? AND pending = 0 AND id <> ?').get(job.id, uid, job.pagesFileId ?? '') as { n: number }).n);
  if (pairs.length > owned) throw new ApiError(`${zipName}: the image list doesn’t match this import`, 400);
  const out: AssetEntry[] = [];
  const paths = new Set<string>();
  const ids = new Set<string>();
  const one = db.prepare('SELECT id, user_id, space_id, name, storage_path, pending, import_job_id FROM files WHERE id = ?');
  for (const [k, v] of pairs) {
    const slashed = slashZipName(k);
    const name = normalizeZipName(slashed);
    if (!name || zipNameSkipped(slashed) || zipNameHidden(name) || zipPathTooLong(name) || !IMAGE_EXT.test(name)) throw new ApiError(`${zipName}: ${k.slice(0, 80)} can’t be used as an image path`, 400);
    if (paths.has(name)) throw new ApiError(`${zipName}: ${name} is listed twice`, 400);
    paths.add(name);
    const id = typeof v === 'string' && UUID.test(v) ? v : '';
    const row = id ? (one.get(id) as { id: string; user_id: string; space_id: string | null; name: string; storage_path: string | null; pending: number; import_job_id: string | null } | undefined) : undefined;
    const parts = (row?.storage_path ?? '').split('/');
    if (!row || row.id === job.pagesFileId || row.user_id !== uid || row.import_job_id !== job.id || Number(row.pending) || row.space_id !== spaceId || parts.length !== 3 || parts[0] !== uid || parts[1] !== row.id) {
      throw new ApiError(`${zipName}: the image list doesn’t match this import`, 400);
    }
    if (ids.has(row.id)) throw new ApiError(`${zipName}: the same image was listed twice`, 400);
    ids.add(row.id);
    out.push({ name, data: Buffer.alloc(0), url: `/files/${row.id}/${encodeURIComponent(row.name)}`, fileId: row.id });
  }
  return out;
}

/** : about 120 files per 12 hours per user. */
function importRateLimit(uid: string, files: number) {
  for (let i = 0; i < files; i++) {
    if (!hit(`import:${uid}`, 120, 12 * 3600_000)) throw new RateLimitError('You’ve imported a lot of files recently. Try again in a few hours.');
  }
}

/** Database block (inline or full page) the user may add rows to, with its collection. */
function databaseOrThrow(blockId: unknown, uid: string): { block: BlockRecord; col: CollectionRecord } {
  const block = getRecord<BlockRecord>('block', String(blockId ?? ''));
  if (!block || blockRole(block.id, uid) === 'none') throw new ApiError('Not found', 404);
  if (block.type !== 'collection_view' && block.type !== 'collection_view_page') throw new ApiError('Merge with CSV works on databases', 400);
  const col = block.collection_id ? getRecord<CollectionRecord>('collection', block.collection_id) : undefined;
  if (!col || col.parent_id !== block.id) throw new ApiError('Open the original database to merge a CSV', 400);
  if (!roleAtLeast(blockRole(block.id, uid), 'read_and_write')) throw new ApiError('You need edit access to add rows', 403);
  return { block, col };
}

function csvRowsOf(name: string, data: Buffer): string[][] {
  if (/\.xlsx$/i.test(name)) return xlsxToRows(data);
  const text = decodeText(data);
  return /\.tsv$/i.test(name) ? tsvToRows(text) : parseCsv(text);
}

const MERGEABLE: PropertyType[] = ['title', 'text', 'number', 'select', 'multi_select', 'status', 'date', 'checkbox', 'url', 'email', 'phone_number'];

export const handlers: Record<string, Handler> = {
  async importFiles(ctx, { spaceId, parent, files, csvTypes }) {
    const uid = requireUser(ctx);
    const space = spaceOrThrow(spaceId, uid);
    const list = (Array.isArray(files) ? files : []).slice(0, MAX_FILES);
    if (!list.length) throw new ApiError('No files to import', 400);
    // 큰 ZIP 작업(2026-11-19): 글 파일 묶음 하나 + 그 작업에서 올린 그림 표. 이미 끝난 작업을 다시 부르면 새로 만들지 않고 처음 결과를 돌려준다
    const jobRef = list.find((f: any) => f?.job)?.job;
    let job: ImportJob | undefined;
    if (jobRef) {
      if (list.length !== 1) throw new ApiError('A large ZIP is imported on its own', 400);
      job = jobOrThrow(jobRef.id, uid, space.id);
      if (job.state !== 'open') {
        const done = JSON.parse(job.result ?? '{}') as { pageIds?: string[]; pages?: number; databases?: number };
        return { pageIds: done.pageIds ?? [], pages: done.pages ?? 0, databases: done.databases ?? 0, recordMap: { __version__: 3 }, repeated: true };
      }
    }
    importRateLimit(uid, list.length);
    let target: { id: string; table: 'space' | 'block' } = { id: space.id, table: 'space' };
    let afterBlockId: string | undefined;
    if (parent?.kind === 'page' && parent.pageId) {
      const p = getRecord<BlockRecord>('block', String(parent.pageId));
      if (!p || p.space_id !== space.id || !roleAtLeast(blockRole(p.id, uid), 'read_and_write')) throw new ApiError('You can’t import into this page', 403);
      target = { id: p.id, table: 'block' };
      if (typeof parent.afterBlockId === 'string' && p.content?.includes(parent.afterBlockId)) afterBlockId = parent.afterBlockId;
    }
    const types: Record<number, PropertyType | 'skip'> = {};
    if (csvTypes && typeof csvTypes === 'object') {
      for (const [k, v] of Object.entries(csvTypes)) if (/^\d{1,3}$/.test(k) && (v === 'skip' || CSV_COLUMN_TYPES.includes(v as PropertyType))) types[Number(k)] = v as PropertyType | 'skip';
    }
    const specs: Spec[] = [];
    const usedAssets = new Set<string>();
    // Storage에 둔 큰 파일은 하나씩 읽어 바로 변환한다(여러 개를 한꺼번에 메모리에 올리지 않는다)
    const seen = new Set<string>();
    for (const f of list) {
      // 큰 ZIP 작업이면 글 묶음이 이 작업에 등록된 파일인지부터 확인한다(읽어 오기 전에)
      if (job) assertJobPages(f?.url ?? f?.id, job, uid, space.id, String(f?.name ?? 'Untitled').slice(0, 255));
      const { name, file } = await uploadOf(f, uid, space, ctx, seen);
      if (job && !/\.zip$/i.test(name)) throw new ApiError('A large ZIP is imported on its own', 400);
      if (/\.zip$/i.test(name) || file.mime === 'application/zip') specs.push(...zipSpecs(file.data, uid, space.id, name, job ? jobAssets(jobRef.assets, job, uid, space.id, name) : [], usedAssets));
      else if (IMPORT_EXT.test(name)) specs.push(pageFromFile(name, file.data, uid, space.id, {}, types));
      else throw new ApiError(`${name}: this file type can’t be imported`, 400);
    }
    // 2026-11-19(WS-20261119-02): 파일을 읽는 동안(Storage 대기) 권한·대상이 바뀌었을 수 있다. 네트워크 대기는 여기까지이고,
    // 이 아래는 한 트랜잭션에서 대상을 잠근 뒤(잠그면 요청 캐시가 비워져 최신 값) 다시 확인하고 적용한다.
    try {
    return tx(() => {
    lockRecords([target.table === 'block' ? { table: 'block', id: target.id } : { table: 'space', id: space.id }]);
    spaceOrThrow(space.id, uid);
    if (target.table === 'block') {
      const p = getRecord<BlockRecord>('block', target.id);
      if (!p || p.alive === false || p.space_id !== space.id || !roleAtLeast(blockRole(p.id, uid), 'read_and_write')) throw new ApiError('You can’t import into this page', 403);
      if (afterBlockId && !p.content?.includes(afterBlockId)) afterBlockId = undefined;
    }
    const builder = new OpsBuilder(space.id, uid);
    const rootIds: string[] = [];
    for (const s of specs) {
      const extra: Record<string, unknown> = {};
      if (target.table === 'space') extra.permissions = [{ type: 'user_permission', role: 'editor', user_id: uid }];
      rootIds.push(builder.block(s, target.id, target.table, extra));
      if (builder.blockCount > MAX_BLOCKS) throw new ApiError('Import is too large', 413);
    }
    const ops: Operation[] = builder.ops;
    if (target.table === 'space') {
      const sv = spaceViewOf(uid, space.id);
      if (!sv) throw new ApiError('Workspace view not found', 404);
      for (const id of [...rootIds].reverse()) ops.push({ pointer: { table: 'space_view', id: sv.id, spaceId: space.id }, path: ['private_pages'], command: 'listBefore', args: { id } });
    } else {
      let after: string | undefined = afterBlockId;
      if (!after) {
        const p = getRecord<BlockRecord>('block', target.id);
        after = p?.content?.[p.content.length - 1];
      }
      for (const id of rootIds) {
        ops.push({ pointer: { table: 'block', id: target.id, spaceId: space.id }, path: ['content'], command: 'listAfter', args: after ? { id, after } : { id } });
        after = id;
      }
    }
    const changes = applyTransactions(uid, [{ id: newId(), spaceId: space.id, debug: { userAction: 'importFiles' }, operations: ops }], ctx.clientId);
    const counts = countPages(specs);
    // 작업을 끝냄으로 표시하고 결과와 실제로 쓰인 그림을 적어 둔다(마무리 단계가 쓰이지 않은 그림만 지운다)
    if (job) {
      // 같은 작업으로 두 번 동시에 불렸으면 한쪽만 끝낸다(다른 쪽은 되돌려 페이지가 두 번 생기지 않게)
      const r = db.prepare("UPDATE import_jobs SET state = 'done', result = ? WHERE id = ? AND user_id = ? AND state = 'open'").run(JSON.stringify({ pageIds: rootIds, ...counts, used: [...usedAssets] }), job.id, uid);
      if (!r.changes) throw new JobTaken();
    }
    // 화면에 실어 보낼 범위는 개수와 바이트 예산으로 정한다(buildImportResponse) — 저장 결과와는 무관하다
    return buildImportResponse(uid, { pageIds: rootIds, ...counts }, changes, target);
    });
    } catch (e) {
      // 같은 작업이 그사이 다른 요청으로 끝났다(여기서 만든 것은 되돌려졌다) → 그 결과를 돌려준다. 취소된 작업이면 jobOrThrow가 409
      if (!(e instanceof JobTaken) || !job) throw e;
      const done = JSON.parse(jobOrThrow(job.id, uid, space.id).result ?? '{}') as { pageIds?: string[]; pages?: number; databases?: number };
      return { pageIds: done.pageIds ?? [], pages: done.pages ?? 0, databases: done.databases ?? 0, recordMap: { __version__: 3 }, repeated: true };
    }
  },

  /** CSV import step 2 (column mapping): header, inferred types and sample values; with blockId, the database to merge into. */
  async previewCsv(ctx, { spaceId, url, name, blockId }) {
    const uid = requireUser(ctx);
    const space = spaceOrThrow(spaceId, uid);
    // 합칠 대상의 편집 권한을 파일을 읽기 전에 확인한다(2026-11-19: 큰 파일은 Storage에서 읽어 오므로 순서를 앞당김)
    const mergeInto = blockId ? databaseOrThrow(blockId, uid) : undefined;
    const { file } = await uploadOf({ url, name }, uid, space, ctx);
    // 2026-11-19(Mac 검수 P3): 파일을 읽는 동안 워크스페이스에서 빠졌으면 내용을 돌려주지 않는다(캐시를 거치지 않고 다시 확인)
    withoutRequestCache(() => spaceOrThrow(spaceId, uid));
    let rows: string[][];
    try {
      rows = csvRowsOf(String(name ?? 'file.csv'), file.data);
    } catch (e) {
      throw new ApiError((e as Error).message, 400);
    }
    const header = (rows[0] ?? []).map((h, i) => h.trim() || (i === 0 ? 'Name' : `Column ${i + 1}`));
    const body = rows.slice(1);
    const columns = header.map((h, i) => ({
      index: i, name: h, type: i === 0 ? 'title' : inferColumnType(h, body.map((r) => r[i] ?? '')),
      samples: body.slice(0, 3).map((r) => (r[i] ?? '').slice(0, 80)),
    }));
    let target: { blockId: string; name: string; properties: { id: string; name: string; type: string }[] } | undefined;
    if (mergeInto) {
      // 파일을 읽는 동안 표가 바뀌었을 수 있다 → 캐시를 거치지 않고 권한과 열 목록을 다시 읽는다
      const { block, col } = withoutRequestCache(() => databaseOrThrow(blockId, uid));
      target = { blockId: block.id, name: (col.name ?? []).map((d) => d[0]).join(''), properties: Object.entries(col.schema).filter(([, p]) => MERGEABLE.includes(p.type)).map(([id, p]) => ({ id, name: p.name, type: p.type })) };
    }
    return { columns, rows: body.length, types: CSV_COLUMN_TYPES, target };
  },

  /** "Merge with CSV": append the CSV's rows to an existing database (no updates of existing rows, as expected). */
  async mergeCsv(ctx, { blockId, url, name, mapping }) {
    const uid = requireUser(ctx);
    const pre = databaseOrThrow(blockId, uid);
    const space = spaceOrThrow(pre.block.space_id, uid);
    importRateLimit(uid, 1);
    const { file } = await uploadOf({ url, name }, uid, space, ctx);
    let rows: string[][];
    try {
      rows = csvRowsOf(String(name ?? 'file.csv'), file.data);
    } catch (e) {
      throw new ApiError((e as Error).message, 400);
    }
    if (rows.length < 2) throw new ApiError('The CSV has no rows', 400);
    if (rows.length > 10_001) throw new ApiError('Merge up to 10,000 rows at a time', 413);
    // 2026-11-19(WS-20261119-02, Mac 검수 P2): 파일을 읽는 동안(Storage 대기) 다른 요청이 같은 표에 열·옵션을 더했을 수 있다.
    // 아래는 열 목록 전체(schema)를 통째로 써넣으므로, 대기 전에 읽어 둔 값으로 만들면 그사이 생긴 열이 사라진다.
    // → 네트워크 대기는 여기까지. 한 트랜잭션에서 표·컬렉션·보기를 잠그고(잠그면 요청 캐시가 비워져 최신 값),
    //   권한·대상을 다시 확인한 뒤 **최신 스키마**에 합친다. 같은 표의 두 요청은 잠금 순서대로 차례로 처리된다.
    return tx(() => {
    const preViews = pre.block.view_ids ?? [];
    lockRecords([{ table: 'block', id: pre.block.id }, { table: 'collection', id: pre.col.id }, ...preViews.map((id) => ({ table: 'collection_view', id }))]);
    const { block, col } = databaseOrThrow(blockId, uid);
    spaceOrThrow(block.space_id, uid);
    const nowViews = block.view_ids ?? [];
    // 잠근 대상과 지금 표가 가리키는 대상이 다르면(컬렉션이 바뀜·보기가 늘거나 줄어듦) 잠그지 않은 것을 고치게 되므로 멈춘다
    if (col.id !== pre.col.id || block.space_id !== pre.block.space_id || nowViews.length !== preViews.length || nowViews.some((v) => !preViews.includes(v))) {
      throw new ApiError('가져오는 동안 표가 바뀌었습니다. 다시 시도해 주세요.', 409);
    }
    const header = rows[0].map((h) => h.trim());
    const schema = { ...col.schema };
    const byName = new Map(Object.entries(schema).map(([id, p]) => [p.name.trim().toLowerCase(), id]));
    const target: (string | null)[] = [];
    const newProps: Record<string, any> = {};
    header.forEach((h, i) => {
      const m = mapping && typeof mapping === 'object' ? (mapping as Record<string, string>)[String(i)] : undefined;
      if (m === 'skip') return void target.push(null);
      // 2026-11-19(Mac 검수 P2): 사용자가 직접 고른 열이 파일을 읽는 동안 사라졌거나 **종류가 달라졌으면** 멈추고 알린다
      // (줄·열 변화 없음). 같은 이름의 새 열을 만들어 넣지 않고, 글자 → 숫자처럼 넣을 수 있는 종류끼리 바뀐 경우에도 넣지 않는다
      // (고를 때 본 종류로 값을 해석하면 「00723」이 723이 되는 식으로 값이 달라진다). 처음부터 없던 id는 예전 동작 그대로.
      const was = m && m !== 'new' ? pre.col.schema[m] : undefined;
      if (was && (!schema[m!] || schema[m!].type !== was.type)) {
        throw new ApiError('가져오는 동안 선택한 열이 바뀌었습니다. 열 연결을 다시 확인해 주세요.', 409);
      }
      if (m && m !== 'new' && schema[m] && MERGEABLE.includes(schema[m].type)) return void target.push(m);
      if (!m && i === 0 && !byName.has(h.toLowerCase())) return void target.push('title');
      const existing = byName.get(h.toLowerCase());
      if (!m && existing && MERGEABLE.includes(schema[existing].type)) return void target.push(existing);
      if (!h) return void target.push(null);
      // unmatched column → a new Text property
      let id = shortPropId();
      while (schema[id]) id = shortPropId();
      schema[id] = { name: h, type: 'text' };
      newProps[id] = schema[id];
      byName.set(h.toLowerCase(), id);
      target.push(id);
    });
    const ops: Operation[] = [];
    const sp = block.space_id;
    // select / multi-select / status options that the CSV introduces
    const optionsAdded = new Map<string, Set<string>>();
    const now = Date.now();
    const rowIds: string[] = [];
    for (const r of rows.slice(1)) {
      if (r.every((c) => !c.trim())) continue;
      const properties: Record<string, any> = {};
      target.forEach((pid, i) => {
        if (!pid) return;
        const raw = (r[i] ?? '').trim();
        if (!raw) return;
        const prop = schema[pid];
        let v: any = raw;
        if (prop.type === 'number') v = Number(raw.replace(/[$€£₩¥,%\s]/g, ''));
        else if (prop.type === 'date') {
          const d = parseDateCell(raw);
          if (!d) return;
          // 이식판(2026-11-11): 날짜 뒤 「HH:MM」 시간은 버리지 않고 함께 넣는다
          const tm = /^S+[ T](d{1,2}):(d{2})/.exec(raw);
          v = tm && Number(tm[1]) < 24 ? { date: d, time: `${tm[1].padStart(2, '0')}:${tm[2]}` } : { date: d };
        } else if (prop.type === 'multi_select') v = raw.split(',').map((x) => x.trim()).filter(Boolean);
        if (prop.type === 'select' || prop.type === 'status' || prop.type === 'multi_select') {
          const known = new Set((prop.options ?? []).map((o) => o.value));
          for (const val of Array.isArray(v) ? v : [v]) if (!known.has(val)) optionsAdded.set(pid, (optionsAdded.get(pid) ?? new Set()).add(val));
        }
        const enc = encodeRowValue(prop, v);
        if (enc) properties[pid] = enc;
      });
      const id = newId();
      rowIds.push(id);
      ops.push({
        pointer: { table: 'block', id, spaceId: sp }, path: [], command: 'set',
        args: { id, type: 'page', properties, parent_id: col.id, parent_table: 'collection', space_id: sp, alive: true, created_time: now, created_by_id: uid, created_by_table: 'lit_user', last_edited_time: now, last_edited_by_id: uid, last_edited_by_table: 'lit_user' },
      });
    }
    const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
    for (const [pid, vals] of optionsAdded) {
      const prop = schema[pid];
      const opts = [...(prop.options ?? [])];
      for (const v of vals) opts.push({ id: newId(), value: v, color: COLORS[opts.length % COLORS.length] });
      schema[pid] = { ...prop, options: opts };
      if (prop.type === 'status' && prop.groups?.length) {
        const added = opts.slice((prop.options ?? []).length).map((o) => o.id);
        schema[pid].groups = prop.groups.map((g, gi) => (gi === 0 ? { ...g, optionIds: [...g.optionIds, ...added] } : g));
      }
    }
    if (Object.keys(newProps).length || optionsAdded.size) ops.unshift({ pointer: { table: 'collection', id: col.id, spaceId: sp }, path: ['schema'], command: 'set', args: schema });
    // new columns show up in every table view
    if (Object.keys(newProps).length) {
      for (const vid of block.view_ids ?? []) {
        const v = getRecord<any>('collection_view', vid);
        if (!v || v.type !== 'table') continue;
        const list = [...((v.format?.table_properties ?? []) as any[]), ...Object.keys(newProps).map((p) => ({ property: p, visible: true, width: 200 }))];
        ops.push({ pointer: { table: 'collection_view', id: vid, spaceId: sp }, path: ['format', 'table_properties'], command: 'set', args: list });
      }
    }
    // a user-initiated write: lock database and property access apply as to Workspace edits (dbaccess.ts)
    const changes = applyTransactions(uid, [{ id: newId(), spaceId: sp, debug: { userAction: 'mergeCsv' }, operations: ops }], ctx.clientId, { userInitiated: true });
    const rm = new RecordMapBuilder(uid);
    for (const ch of changes) rm.add(ch.table, ch.record);
    return { added: rowIds.length, newProperties: Object.values(newProps).map((p) => p.name), recordMap: rm.map };
    });
  },
};
