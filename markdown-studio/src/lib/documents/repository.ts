import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  DEFAULT_PREFERENCES, DocumentError, MAX_MARKDOWN_LENGTH, descendants,
  normalizeName, sanitizePinColors, sanitizePinNames, validatePlacement, verifyOwner,
  type DocumentNode, type DocumentRevision, type DriveMapping, type NodeKind, type WorkspacePreferences,
} from "./model";
import { MAX_IMPORT_NODES, orderParentsFirst, uniqueName, validateTree, type ImportItem } from "./backup";

interface DocumentDatabase extends DBSchema {
  nodes: { key: string; value: DocumentNode };
  revisions: { key: string; value: DocumentRevision; indexes: { "by-node": string } };
  preferences: { key: string; value: WorkspacePreferences };
  drive: { key: string; value: unknown };
}
// Per-member database + per-record owner checks. Local storage is device storage,
// not server-side RLS and not encryption against other people using the same OS profile.
export class DocumentRepository {
  private dbPromise: Promise<IDBPDatabase<DocumentDatabase>>;
  constructor(readonly userId: string) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(userId)) throw new DocumentError("OWNER", "회원 식별 정보가 올바르지 않습니다.");
    this.dbPromise = openDB<DocumentDatabase>(`aimaster-markdown-v1-${userId}`, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("nodes", { keyPath: "id" });
          db.createObjectStore("revisions", { keyPath: "key" }).createIndex("by-node", "nodeId");
          db.createObjectStore("preferences");
        }
        if (oldVersion < 2) db.createObjectStore("drive"); // v1.03: Google Drive 연결 기록
      },
      blocking: () => { void this.close(); },
    });
  }
  async close() { (await this.dbPromise).close(); }
  async list() {
    const rows = await (await this.dbPromise).getAll("nodes");
    rows.forEach(n => verifyOwner(n, this.userId));
    return rows.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  async preferences() {
    return (await (await this.dbPromise).get("preferences", "workspace")) ?? { ...DEFAULT_PREFERENCES };
  }
  async savePreferences(value: WorkspacePreferences) {
    // v1.12: 대시보드 고정 문서(pinnedIds)도 저장 — 문자열 id만, 최대 50개
    const pinnedIds = Array.isArray(value.pinnedIds) ? value.pinnedIds.filter((id): id is string => typeof id === "string").slice(0, 50) : [];
    // v1.14: 고정 문서의 색깔 꼬리표 — 고정된 문서·정해진 색만
    const pinColors = sanitizePinColors(value.pinColors, pinnedIds);
    const next = { activeId: value.activeId, explorerOpen: !!value.explorerOpen, editorPercent: Math.min(75, Math.max(25, value.editorPercent || 50)), pinnedIds, pinColors, pinNames: sanitizePinNames(value.pinNames) };
    await (await this.dbPromise).put("preferences", next, "workspace");
  }
  async create(kind: NodeKind, rawName: string, parentId: string | null = null, markdown = "") {
    const name = normalizeName(rawName);
    if (markdown.length > MAX_MARKDOWN_LENGTH) throw new DocumentError("INVALID", "문서 한 개는 100만 자까지 저장할 수 있습니다.");
    const db = await this.dbPromise;
    const tx = db.transaction(["nodes", "revisions"], "readwrite");
    try {
      const nodes = await tx.objectStore("nodes").getAll();
      nodes.forEach(n => verifyOwner(n, this.userId));
      validatePlacement(nodes, this.userId, null, parentId, name);
      const node: DocumentNode = { id: crypto.randomUUID(), userId: this.userId, kind, parentId, name,
        markdown: kind === "document" ? markdown : "", revision: 1, updatedAt: new Date().toISOString(), deletedAt: null, trashBatchId: null };
      await tx.objectStore("nodes").add(node);
      if (kind === "document") await tx.objectStore("revisions").put(this.snapshot(node));
      await tx.done;
      return node;
    } catch (error) { try { tx.abort(); } catch {} await tx.done.catch(() => {}); throw error; }
  }
  private snapshot(node: DocumentNode): DocumentRevision {
    return { key: `${node.id}:${node.revision}`, nodeId: node.id, userId: this.userId,
      revision: node.revision, name: node.name, markdown: node.markdown, savedAt: node.updatedAt };
  }
  async update(id: string, expectedRevision: number, change: Partial<Pick<DocumentNode, "name" | "parentId" | "markdown">>) {
    const db = await this.dbPromise;
    const tx = db.transaction(["nodes", "revisions"], "readwrite");
    try {
      const nodes = await tx.objectStore("nodes").getAll();
      nodes.forEach(n => verifyOwner(n, this.userId));
      const current = this.current(nodes, id, expectedRevision);
      const next = { ...current, ...change, name: normalizeName(change.name ?? current.name), revision: current.revision + 1, updatedAt: new Date().toISOString() };
      if (next.kind === "folder" && next.markdown) throw new DocumentError("INVALID", "폴더에는 본문을 저장할 수 없습니다.");
      if (next.markdown.length > MAX_MARKDOWN_LENGTH) throw new DocumentError("INVALID", "문서 한 개는 100만 자까지 저장할 수 있습니다.");
      validatePlacement(nodes, this.userId, id, next.parentId, next.name);
      await tx.objectStore("nodes").put(next);
      if (next.kind === "document") {
        await tx.objectStore("revisions").put(this.snapshot(next));
        const history = await tx.objectStore("revisions").index("by-node").getAll(id);
        // Keep the latest 30 snapshots per document; no automatic permanent document deletion.
        for (const old of history.sort((a,b) => b.revision-a.revision).slice(30)) await tx.objectStore("revisions").delete(old.key);
      }
      await tx.done; return next;
    } catch (error) { try { tx.abort(); } catch {} await tx.done.catch(() => {}); throw error; }
  }
  private current(nodes: DocumentNode[], id: string, expectedRevision: number, deleted = false) {
    const node = nodes.find(n => n.id === id);
    if (!node || (!deleted && node.deletedAt)) throw new DocumentError("NOT_FOUND", "문서를 찾을 수 없습니다. 목록을 다시 불러와 주세요.");
    verifyOwner(node, this.userId);
    if (node.revision !== expectedRevision) throw new DocumentError("CONFLICT", "다른 탭에서 수정되었습니다. 현재 원고를 복사하거나 내려받은 뒤 최신 문서를 불러와 주세요.");
    return node;
  }
  async trash(id: string, expectedRevision: number) { return this.changeTrash(id, expectedRevision, false); }
  async restore(id: string, expectedRevision: number) { return this.changeTrash(id, expectedRevision, true); }
  private async changeTrash(id: string, expectedRevision: number, restore: boolean) {
    const db = await this.dbPromise;
    const tx = db.transaction("nodes", "readwrite");
    try {
      const nodes = await tx.store.getAll(); nodes.forEach(n => verifyOwner(n, this.userId));
      const root = this.current(nodes, id, expectedRevision, restore);
      const all = descendants(nodes, id);
      const updatedAt = new Date().toISOString();
      if (restore) {
        if (!root.deletedAt) throw new DocumentError("INVALID", "휴지통에 있는 항목만 복원할 수 있습니다.");
        const ancestor = nodes.find(n => n.id === root.parentId);
        const parentId = ancestor && !ancestor.deletedAt ? ancestor.id : null;
        validatePlacement(nodes, this.userId, id, parentId, root.name);
        // Only restore children deleted with this operation. Previously trashed
        // children remain trashed, even when their parent is restored.
        for (const node of nodes.filter(n => all.has(n.id) && n.trashBatchId === root.trashBatchId)) {
          await tx.store.put({ ...node, parentId: node.id === id ? parentId : node.parentId,
            deletedAt: null, trashBatchId: null, revision: node.revision + 1, updatedAt });
        }
      } else {
        const batch = crypto.randomUUID();
        for (const node of nodes.filter(n => all.has(n.id) && !n.deletedAt)) {
          await tx.store.put({ ...node, deletedAt: updatedAt, trashBatchId: batch, revision: node.revision + 1, updatedAt });
        }
      }
      await tx.done;
    } catch (error) { try { tx.abort(); } catch {} await tx.done.catch(() => {}); throw error; }
  }
  /**
   * 가져오기·복원: 항목들을 새 문서·폴더로 한 번에 만든다. 하나라도 실패하면 아무것도 만들지 않는다(원자적).
   * 기존 항목은 덮어쓰지 않으며, 같은 폴더에 같은 이름이 있으면 (2), (3)을 붙인다.
   */
  async importTree(items: ImportItem[], targetParentId: string | null = null) {
    if (!items.length) throw new DocumentError("INVALID", "가져올 항목이 없습니다.");
    if (items.length > MAX_IMPORT_NODES) throw new DocumentError("INVALID", `한 번에 ${MAX_IMPORT_NODES.toLocaleString()}개까지 가져올 수 있습니다.`);
    validateTree(items);
    const db = await this.dbPromise;
    const tx = db.transaction(["nodes", "revisions"], "readwrite");
    try {
      const nodes = await tx.objectStore("nodes").getAll();
      nodes.forEach(n => verifyOwner(n, this.userId));
      if (targetParentId) {
        const parent = nodes.find(n => n.id === targetParentId);
        if (!parent || parent.deletedAt || parent.kind !== "folder") throw new DocumentError("INVALID", "대상 폴더를 찾을 수 없습니다.");
      }
      const live = nodes.filter(n => !n.deletedAt);
      const taken = new Map<string | null, Set<string>>();
      const siblings = (parentId: string | null) => {
        let set = taken.get(parentId);
        if (!set) { set = new Set(live.filter(n => n.parentId === parentId).map(n => n.name.toLocaleLowerCase())); taken.set(parentId, set); }
        return set;
      };
      const ids = new Map<string, string>();
      const now = new Date().toISOString();
      let renamed = 0;
      for (const item of orderParentsFirst(items)) {
        const parentId = item.parentKey ? ids.get(item.parentKey)! : targetParentId;
        const set = siblings(parentId);
        const name = uniqueName(normalizeName(item.name), set);
        if (name !== item.name) renamed++;
        set.add(name.toLocaleLowerCase());
        if (item.markdown.length > MAX_MARKDOWN_LENGTH) throw new DocumentError("INVALID", `'${item.name}'의 본문이 너무 깁니다. 문서 한 개는 100만 자까지입니다.`);
        const node: DocumentNode = { id: crypto.randomUUID(), userId: this.userId, kind: item.kind, parentId, name,
          markdown: item.kind === "document" ? item.markdown : "", revision: 1, updatedAt: now, deletedAt: null, trashBatchId: null };
        await tx.objectStore("nodes").add(node);
        if (node.kind === "document") await tx.objectStore("revisions").put(this.snapshot(node));
        ids.set(item.key, node.id);
      }
      await tx.done;
      return { created: items.length, renamed, ids: Object.fromEntries(ids) as Record<string, string>, firstDocumentId: items.filter(i => i.kind === "document").map(i => ids.get(i.key)!)[0] ?? null };
    } catch (error) { try { tx.abort(); } catch {} await tx.done.catch(() => {}); throw error; }
  }
  /**
   * v1.17 휴지통 비우기: 휴지통의 이 회원 항목을 이 기기에서 영구 삭제한다(되돌릴 수 없음 — 회원이 확인 창에서 직접 누를 때만).
   * 수정 이력·Drive 연결 기록도 함께 지운다. Google Drive의 파일은 건드리지 않는다.
   */
  async purgeTrash() {
    return this.purge(nodes => new Set(nodes.filter(n => n.deletedAt).map(n => n.id)));
  }
  /**
   * v1.18 휴지통 항목 하나만 영구 삭제: 휴지통에 보이는 항목과, 함께 휴지통에 넣은 안쪽 항목(같은 trashBatchId)만.
   * 따로 먼저 휴지통에 넣은 안쪽 항목은 휴지통에 남는다(복원하면 최상위로).
   */
  async purgeTrashItem(id: string, expectedRevision: number) {
    return this.purge(nodes => {
      const root = this.current(nodes, id, expectedRevision, true);
      if (!root.deletedAt) throw new DocumentError("INVALID", "휴지통에 있는 항목만 영구 삭제할 수 있습니다.");
      const all = descendants(nodes, id);
      return new Set(nodes.filter(n => all.has(n.id) && n.deletedAt && n.trashBatchId === root.trashBatchId).map(n => n.id).concat(id));
    });
  }
  private async purge(select: (nodes: DocumentNode[]) => Set<string>) {
    const db = await this.dbPromise;
    const tx = db.transaction(["nodes", "revisions", "drive"], "readwrite");
    try {
      const nodes = await tx.objectStore("nodes").getAll();
      nodes.forEach(n => verifyOwner(n, this.userId));
      const gone = select(nodes);
      for (const id of gone) {
        await tx.objectStore("nodes").delete(id);
        for (const key of await tx.objectStore("revisions").index("by-node").getAllKeys(id)) await tx.objectStore("revisions").delete(key);
      }
      for (const key of await tx.objectStore("drive").getAllKeys()) {
        const k = String(key);
        if (k.startsWith("map:") && gone.has(k.slice(k.lastIndexOf(":") + 1))) await tx.objectStore("drive").delete(key);
      }
      // 남은 항목이 지운 폴더를 가리키면 최상위로(복원 규칙과 같음)
      const updatedAt = new Date().toISOString();
      for (const n of nodes.filter(n => !n.deletedAt && n.parentId && gone.has(n.parentId))) {
        await tx.objectStore("nodes").put({ ...n, parentId: null, revision: n.revision + 1, updatedAt });
      }
      await tx.done;
      return { purged: gone.size, ids: [...gone] };
    } catch (error) { try { tx.abort(); } catch {} await tx.done.catch(() => {}); throw error; }
  }
  // ---- Google Drive 연결 기록 (설정·계정별 연결 정보). 문서 본문과 토큰은 여기에 저장하지 않는다 ----
  async driveSettings(): Promise<{ clientId: string; lastAccountId?: string }> {
    const v = (await (await this.dbPromise).get("drive", "settings")) as { clientId?: string; lastAccountId?: string } | undefined;
    return { clientId: v?.clientId ?? "", lastAccountId: v?.lastAccountId };
  }
  async saveDriveSettings(value: { clientId: string; lastAccountId?: string }) {
    await (await this.dbPromise).put("drive", { clientId: value.clientId.trim(), lastAccountId: value.lastAccountId }, "settings");
  }
  async driveRootFolder(accountId: string): Promise<string | null> {
    return ((await (await this.dbPromise).get("drive", `root:${accountId}`)) as string | undefined) ?? null;
  }
  async saveDriveRootFolder(accountId: string, folderId: string) {
    await (await this.dbPromise).put("drive", folderId, `root:${accountId}`);
  }
  async driveMappings(accountId: string): Promise<DriveMapping[]> {
    const prefix = `map:${accountId}:`;
    const db = await this.dbPromise;
    const rows = (await db.getAll("drive", IDBKeyRange.bound(prefix, `${prefix}￿`))) as DriveMapping[];
    return rows.filter(r => r.accountId === accountId);
  }
  async saveDriveMapping(mapping: DriveMapping) {
    await (await this.dbPromise).put("drive", mapping, `map:${mapping.accountId}:${mapping.nodeId}`);
  }
  /** 이 기기의 Drive 연결 기록만 지운다(Drive의 파일은 건드리지 않는다) */
  async forgetDriveAccount(accountId: string) {
    const db = await this.dbPromise;
    const tx = db.transaction("drive", "readwrite");
    const prefix = `map:${accountId}:`;
    for (const key of await tx.store.getAllKeys(IDBKeyRange.bound(prefix, `${prefix}￿`))) await tx.store.delete(key);
    await tx.store.delete(`root:${accountId}`);
    await tx.done;
  }
  async history(id: string) {
    const node = await (await this.dbPromise).get("nodes", id);
    if (!node) throw new DocumentError("NOT_FOUND", "문서를 찾을 수 없습니다.");
    verifyOwner(node, this.userId);
    const rows = await (await this.dbPromise).getAllFromIndex("revisions", "by-node", id);
    if (rows.some(r => r.userId !== this.userId)) throw new DocumentError("OWNER", "본인 수정 이력만 사용할 수 있습니다.");
    return rows.sort((a,b) => b.revision-a.revision);
  }
  async restoreRevision(id: string, expectedRevision: number, revision: number) {
    const previous = (await this.history(id)).find(r => r.revision === revision);
    if (!previous) throw new DocumentError("NOT_FOUND", "수정 이력을 찾을 수 없습니다.");
    return this.update(id, expectedRevision, { markdown: previous.markdown });
  }
}
