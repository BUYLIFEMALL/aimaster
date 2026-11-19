// Page history (snapshots) and activity log ("Updates" panel, page history modal).
import type { Transaction } from '#shared/ops.ts';
import type { BlockRecord, CollectionRecord, CollectionViewRecord } from '#shared/records.ts';
import { newId } from '#shared/ids.ts';
import { childrenOf, db, getRecord, onTxRollback } from './db.ts';
import { pageIdOf } from './search.ts';
import type { AppliedChange } from './records.ts';
import { childBlocks } from './tree.ts';

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // a new version at most every 10 minutes of editing
const pendingPages = new Map<string, { authors: Set<string>; since: number }>();

const lastSnap = db.prepare('SELECT created_time FROM snapshots WHERE page_id = ? ORDER BY created_time DESC LIMIT 1');
const insertSnap = db.prepare('INSERT INTO snapshots (id, page_id, space_id, created_time, author_ids, data) VALUES (?, ?, ?, ?, ?, ?)');
const insertActivity = db.prepare('INSERT INTO activity (id, space_id, page_id, block_id, user_id, type, created_time, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

/**
 * A database as it was in a version: its views (as shown on this page) and — for databases this block owns —
 * the data source (properties, name, icon, description) and its records with their property values. Records' page
 * content is not part of it.
 */
export interface DatabaseSnapshot {
  blockId: string;
  collectionId: string | null;
  /** the data source lives in this block (else a linked database: only its views are this page's) */
  owned: boolean;
  views: CollectionViewRecord[];
  collection?: CollectionRecord;
  rows?: BlockRecord[];
}

const MAX_SNAPSHOT_ROWS = 1000;

/** Databases shown by `blocks` (the page itself when it is a full-page database, and inline / linked databases). */
function serializeDatabases(blocks: BlockRecord[]): Record<string, DatabaseSnapshot> {
  const out: Record<string, DatabaseSnapshot> = {};
  for (const b of blocks) {
    if (b.type !== 'collection_view_page' && b.type !== 'collection_view') continue;
    if (Object.keys(out).length >= 20) break;
    const col = b.collection_id ? getRecord<CollectionRecord>('collection', b.collection_id) : undefined;
    const owned = !!col && col.parent_id === b.id && col.parent_table === 'block';
    const views = (b.view_ids ?? []).map((id) => getRecord<CollectionViewRecord>('collection_view', id)).filter((v): v is CollectionViewRecord => !!v && v.alive !== false);
    const snap: DatabaseSnapshot = { blockId: b.id, collectionId: col?.id ?? null, owned, views };
    if (owned && col) {
      snap.collection = col;
      snap.rows = childrenOf<BlockRecord>('block', col.id)
        .filter((r) => r.parent_table === 'collection' && r.alive && !r.is_template)
        .sort((a, c) => (a.created_time ?? 0) - (c.created_time ?? 0))
        .slice(0, MAX_SNAPSHOT_ROWS)
        .map((r) => {
          const { content: _c, discussions: _d, ...row } = r as BlockRecord & Record<string, unknown>;
          return row as BlockRecord;
        });
    }
    out[b.id] = snap;
  }
  return out;
}

/** Serialize the page subtree (blocks only, not nested pages' content) plus the databases it shows. */
export function serializePage(pageId: string): { blocks: BlockRecord[]; databases?: Record<string, DatabaseSnapshot> } {
  const blocks: BlockRecord[] = [];
  const root = getRecord<BlockRecord>('block', pageId);
  if (!root) return { blocks };
  const queue = [root];
  while (queue.length) {
    const b = queue.shift()!;
    blocks.push(b);
    const isNestedPage = b.id !== pageId && (b.type === 'page' || b.type === 'collection_view_page');
    if (isNestedPage) continue;
    // only real children: ids listed in `content` that belong to another page are not part of this one
    for (const c of childBlocks(b)) queue.push(c);
    if (blocks.length > 50_000) break;
  }
  const databases = serializeDatabases(blocks.filter((b) => b.id === pageId || b.type === 'collection_view'));
  return Object.keys(databases).length ? { blocks, databases } : { blocks };
}

/** The page whose version history covers a record: a database record / data source / view counts for the page
 * showing that database (the full-page database itself, or the page holding an inline database). */
export function historyPageOf(table: string, record: { id: string; parent_id?: string; parent_table?: string }): string | null {
  let blockId: string | undefined;
  if (table === 'block' && record.parent_table === 'collection') blockId = getRecord<CollectionRecord>('collection', String(record.parent_id))?.parent_id;
  else if (table === 'collection' || table === 'collection_view') blockId = record.parent_table === 'block' ? record.parent_id : undefined;
  if (!blockId) return null;
  const host = getRecord<BlockRecord>('block', blockId);
  if (!host || (host.type !== 'collection_view_page' && host.type !== 'collection_view')) return null;
  return host.type === 'collection_view_page' ? host.id : pageIdOf(host);
}

/** Blocks of a stored snapshot that belong to its page: reachable from the root through children that point back
 * at their parent (snapshots written before the content checks may hold foreign blocks listed in `content`). */
export function snapshotBlocks(pageId: string, blocks: unknown): BlockRecord[] {
  const list = Array.isArray(blocks) ? (blocks as BlockRecord[]) : [];
  const byId = new Map(list.map((b) => [b.id, b]));
  const out: BlockRecord[] = [];
  const root = byId.get(pageId);
  if (!root) return out;
  const queue = [root];
  const seen = new Set<string>();
  while (queue.length) {
    const b = queue.shift()!;
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    out.push(b);
    for (const id of b.content ?? []) {
      const c = byId.get(id);
      if (c && c.parent_table === 'block' && c.parent_id === b.id) queue.push(c);
    }
  }
  return out;
}

/** The page a block's version history belongs to: the nearest stored ancestor that is a page, a full-page database
 * or a database record (its own page). null when the chain can't be confirmed — an ancestor isn't stored, or the
 * top isn't a page. (pageIdOf answers with the block's own id in that case, which is right for search but must never
 * become a snapshots.page_id.) */
function versionPageOf(block: BlockRecord | undefined): string | null {
  let cur = block;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.type === 'page' || cur.type === 'collection_view_page' || cur.parent_table === 'collection') return cur.id;
    if (cur.parent_table !== 'block') return null;
    cur = getRecord<BlockRecord>('block', cur.parent_id);
  }
  return null;
}

/**
 * 2026-11-19(WS-20261119-03 D): 한 번의 쓰기(applyTransactions)로 바뀐 블록들의 버전 기록 처리. 바뀐 레코드를 **모두 저장한 뒤**
 * 한 번 부른다. 예전에는 블록을 저장할 때마다 불러서, 부모가 아직 저장되지 않은 블록(자식부터 쓰는 가져오기·붙여넣기)은
 * 자기 id가 「쪽」으로 잡혀 snapshots에 일반 블록 id 줄이 생겼고(쓰이지 않는 줄), 같은 쪽을 블록 수만큼 다시 조회했다.
 * 지금은 실제 쪽(페이지·전체 페이지 데이터베이스·데이터베이스 행)과 그 데이터베이스를 보여 주는 쪽만, 쪽마다 한 번 처리한다.
 * 10분 간격·작성자 모으기 규칙은 그대로다. 이 쓰기가 되돌려지면 메모리의 대기 작성자도 쓰기 전으로 돌린다.
 */
export function snapshotChanged(blocks: BlockRecord[], userId: string, now: number) {
  const pages = new Set<string>();
  for (const block of blocks) {
    // database records also count for the page showing their database
    if (block.parent_table === 'collection') {
      const hostId = historyPageOf('block', block);
      const host = hostId ? versionPageOf(getRecord<BlockRecord>('block', hostId)) : null;
      if (host && host !== block.id) pages.add(host);
    }
    const own = versionPageOf(block);
    if (own) pages.add(own);
  }
  if (!pages.size) return;
  const before = new Map<string, { authors: Set<string>; since: number } | undefined>();
  for (const id of pages) {
    const p = pendingPages.get(id);
    before.set(id, p ? { authors: new Set(p.authors), since: p.since } : undefined);
  }
  onTxRollback(() => {
    for (const [id, p] of before) {
      if (p) pendingPages.set(id, p);
      else pendingPages.delete(id);
    }
  });
  for (const id of pages) notePending(id, userId, now);
}

/** One block (kept for callers outside applyTransactions): same rules as snapshotChanged. */
export function maybeSnapshot(block: BlockRecord, userId: string, now: number) {
  snapshotChanged([block], userId, now);
}

function notePending(pageId: string, userId: string, now: number) {
  const p = pendingPages.get(pageId) ?? { authors: new Set(), since: now };
  p.authors.add(userId);
  pendingPages.set(pageId, p);
  const last = (lastSnap.get(pageId) as { created_time: number } | undefined)?.created_time ?? 0;
  if (now - last >= SNAPSHOT_INTERVAL_MS) takeSnapshot(pageId, [...p.authors], now);
}

export function takeSnapshot(pageId: string, authors: string[], now = Date.now()) {
  const page = getRecord<BlockRecord>('block', pageId);
  if (!page) return;
  insertSnap.run(newId(), pageId, page.space_id, now, JSON.stringify(authors), JSON.stringify(serializePage(pageId)));
  pendingPages.delete(pageId);
}

export function listSnapshots(pageId: string, limit = 100) {
  return db.prepare('SELECT id, created_time, author_ids FROM snapshots WHERE page_id = ? ORDER BY created_time DESC LIMIT ?')
    .all(pageId, limit)
    .map((r: any) => ({ id: r.id, createdTime: r.created_time, authorIds: JSON.parse(r.author_ids || '[]') }));
}

export function getSnapshot(id: string) {
  const r = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(String(id)) as any;
  if (!r) return null;
  const data = JSON.parse(r.data);
  // callers only ever see the page's own subtree
  return { id: r.id, pageId: r.page_id, createdTime: r.created_time, authorIds: JSON.parse(r.author_ids || '[]'), data: { ...data, blocks: snapshotBlocks(r.page_id, data?.blocks) } };
}

export function recordActivity(userId: string, changes: AppliedChange[], transactions: Transaction[]) {
  const now = Date.now();
  const action = transactions[0]?.debug?.userAction ?? 'edit';
  const pages = new Map<string, { spaceId: string | null; blocks: string[] }>();
  for (const ch of changes) {
    // database records, data sources and views are history of the page that shows the database
    const host = ch.table === 'block' || ch.table === 'collection' || ch.table === 'collection_view' ? historyPageOf(ch.table, ch.record as never) : null;
    if (host) {
      const e = pages.get(host) ?? { spaceId: ch.spaceId, blocks: [] };
      if (ch.table === 'block') e.blocks.push(ch.record.id);
      pages.set(host, e);
    }
    if (ch.table !== 'block') continue;
    const b = ch.record as BlockRecord;
    const pageId = pageIdOf(b);
    const e = pages.get(pageId) ?? { spaceId: ch.spaceId, blocks: [] };
    e.blocks.push(b.id);
    pages.set(pageId, e);
  }
  for (const [pageId, e] of pages) {
    // coalesce: one activity row per user/page per 5 minutes
    const recent = db.prepare('SELECT id, data FROM activity WHERE page_id = ? AND user_id = ? AND created_time > ? ORDER BY created_time DESC LIMIT 1')
      .get(pageId, userId, now - 5 * 60 * 1000) as any;
    if (recent) {
      const data = JSON.parse(recent.data);
      data.blocks = [...new Set([...(data.blocks ?? []), ...e.blocks])].slice(0, 200);
      data.last = now;
      db.prepare('UPDATE activity SET data = ? WHERE id = ?').run(JSON.stringify(data), recent.id);
    } else {
      // a schema/view-only change has no block (node:sqlite refuses to bind undefined)
      insertActivity.run(newId(), e.spaceId ?? null, pageId, e.blocks[0] ?? null, userId, action.includes('create') ? 'created' : 'edited', now, JSON.stringify({ blocks: e.blocks, last: now }));
    }
  }
}

export function listActivity(pageId: string, limit = 50) {
  return db.prepare('SELECT * FROM activity WHERE page_id = ? ORDER BY created_time DESC LIMIT ?')
    .all(pageId, limit)
    .map((r: any) => ({ id: r.id, pageId: r.page_id, userId: r.user_id, type: r.type, createdTime: r.created_time, data: JSON.parse(r.data || '{}') }));
}
