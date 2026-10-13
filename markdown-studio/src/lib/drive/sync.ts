// Google Drive 업로드·가져오기 동기화. 로컬 저장소(DocumentRepository)와 Drive API(DriveApi)만 사용한다.
// 원칙: 이름만 보고 덮어쓰지 않는다(ID로 연결) · 충돌은 덮어쓰지 않고 알린다 · 루트 폴더 준비 실패 시 중단(Drive 최상위로 폴백 금지) ·
//       항목별 결과를 정확히 기록한다 · Drive 파일은 삭제하지 않는다.
import { DocumentError, MAX_MARKDOWN_LENGTH, safeFilename, type DocumentNode, type DriveMapping } from "../documents/model";
import type { DocumentRepository } from "../documents/repository";
import type { ImportItem } from "../documents/backup";
import { localDateStamp } from "../export/collect";
import { DriveError, FOLDER_MIME, ROOT_FOLDER_NAME, driveMessage, type DriveApi, type DriveFile } from "./api";

export interface Session { api: DriveApi; accountId: string }

/** Drive의 "마크다운 문서 자동화" 폴더를 준비한다. 실패하면 예외를 던진다(다른 위치로 대신 올리지 않음) */
export async function ensureRootFolder(repo: DocumentRepository, session: Session): Promise<string> {
  const { api, accountId } = session;
  const saved = await repo.driveRootFolder(accountId);
  if (saved) {
    try {
      const meta = await api.getMeta(saved);
      if (!meta.trashed && meta.mimeType === FOLDER_MIME) return saved;
    } catch (e) { if (!(e instanceof DriveError && e.code === "NOT_FOUND")) throw e; }
  }
  const folder = (await api.findFolder("root", ROOT_FOLDER_NAME)) ?? (await api.createFolder("root", ROOT_FOLDER_NAME));
  await repo.saveDriveRootFolder(accountId, folder.id);
  return folder.id;
}

// ---------- 업로드 ----------
export type UploadStatus = "created" | "updated" | "unchanged" | "conflict" | "failed";
export interface UploadResult { nodeId: string; path: string; status: UploadStatus; message?: string }

const pathOf = (nodes: DocumentNode[], node: DocumentNode) => {
  const parts = [node.name]; const seen = new Set([node.id]);
  for (let p = node.parentId; p && !seen.has(p); ) { seen.add(p); const n = nodes.find(x => x.id === p); if (!n) break; parts.unshift(n.name); p = n.parentId; }
  return parts.join("/");
};

export async function uploadDocuments(repo: DocumentRepository, session: Session, rootId: string, docIds: string[], opts: { force?: boolean } = {}): Promise<UploadResult[]> {
  const { api, accountId } = session;
  const nodes = (await repo.list()).filter(n => !n.deletedAt);
  const mappings = new Map((await repo.driveMappings(accountId)).map(m => [m.nodeId, m]));
  const driveFolders = new Map<string, string>(); // 이번 실행에서 확인한 로컬 폴더 id → Drive 폴더 id
  const now = () => new Date().toISOString();

  async function driveFolderFor(localId: string | null): Promise<string> {
    if (!localId) return rootId;
    const cached = driveFolders.get(localId);
    if (cached) return cached;
    const node = nodes.find(n => n.id === localId);
    if (!node) throw new DriveError("INVALID", "상위 폴더를 찾을 수 없습니다.");
    const parent = await driveFolderFor(node.parentId);
    const mapped = mappings.get(node.id);
    if (mapped) {
      try { const m = await api.getMeta(mapped.fileId); if (!m.trashed && m.mimeType === FOLDER_MIME) { driveFolders.set(localId, mapped.fileId); return mapped.fileId; } }
      catch (e) { if (!(e instanceof DriveError && e.code === "NOT_FOUND")) throw e; }
    }
    const folder = (await api.findFolder(parent, node.name)) ?? (await api.createFolder(parent, node.name));
    const mapping: DriveMapping = { nodeId: node.id, accountId, kind: "folder", fileId: folder.id, parentFileId: parent, lastSyncedRevision: node.revision, remoteModifiedTime: folder.modifiedTime, syncedAt: now() };
    await repo.saveDriveMapping(mapping); mappings.set(node.id, mapping);
    driveFolders.set(localId, folder.id);
    return folder.id;
  }
  const record = async (node: DocumentNode, file: DriveFile, parent: string) => {
    const mapping: DriveMapping = { nodeId: node.id, accountId, kind: "document", fileId: file.id, parentFileId: parent, lastSyncedRevision: node.revision, remoteModifiedTime: file.modifiedTime, remoteMd5: file.md5Checksum, syncedAt: now() };
    await repo.saveDriveMapping(mapping); mappings.set(node.id, mapping);
  };

  const results: UploadResult[] = [];
  let aborted = "";
  for (const id of docIds) {
    const node = nodes.find(n => n.id === id && n.kind === "document");
    if (!node) { results.push({ nodeId: id, path: id, status: "failed", message: "문서를 찾을 수 없습니다." }); continue; }
    const path = pathOf(nodes, node);
    if (aborted) { results.push({ nodeId: id, path, status: "failed", message: `중단됨: ${aborted}` }); continue; }
    try {
      const parent = await driveFolderFor(node.parentId);
      const m = mappings.get(node.id);
      if (!m) { const file = await api.createFile(parent, node.name, node.markdown); await record(node, file, parent); results.push({ nodeId: id, path, status: "created" }); continue; }
      const localChanged = node.revision !== m.lastSyncedRevision;
      const moved = !!m.parentFileId && m.parentFileId !== parent;
      if (!localChanged && !moved && !opts.force) { results.push({ nodeId: id, path, status: "unchanged" }); continue; }
      let meta: DriveFile;
      try { meta = await api.getMeta(m.fileId); }
      catch (e) {
        if (e instanceof DriveError && e.code === "NOT_FOUND") { // Drive에서 사라진 파일: 새로 만든다(이전 연결은 교체)
          const file = await api.createFile(parent, node.name, node.markdown); await record(node, file, parent);
          results.push({ nodeId: id, path, status: "created", message: "Drive에서 파일이 없어 새로 만들었습니다." }); continue;
        }
        throw e;
      }
      if (meta.trashed && !opts.force) { results.push({ nodeId: id, path, status: "conflict", message: "Drive에서 휴지통으로 옮겨진 파일입니다. 덮어쓰려면 '내 문서로 덮어쓰기'를 선택하세요." }); continue; }
      const remoteChanged = meta.modifiedTime !== m.remoteModifiedTime && !(meta.md5Checksum && meta.md5Checksum === m.remoteMd5);
      if (remoteChanged && !opts.force) { results.push({ nodeId: id, path, status: "conflict", message: "Drive에서 이 파일이 바뀌었습니다. 덮어쓰지 않았습니다. 'Drive에서 가져오기'에서 확인하거나 '내 문서로 덮어쓰기'를 선택하세요." }); continue; }
      const file = await api.updateFile(m.fileId, node.name, node.markdown, moved ? { from: m.parentFileId!, to: parent } : undefined);
      await record(node, file, parent);
      results.push({ nodeId: id, path, status: "updated", ...(moved ? { message: "다른 폴더로 옮겼습니다." } : {}) });
    } catch (e) {
      if (e instanceof DriveError && e.code === "AUTH") { aborted = "연결이 만료되었습니다. 다시 연결한 뒤 실패한 항목을 다시 올려 주세요."; }
      results.push({ nodeId: id, path, status: "failed", message: driveMessage(e) });
    }
  }
  return results;
}

// ---------- Drive 목록·가져오기 ----------
export type RemoteStatus = "new" | "same" | "remote-changed" | "both-changed";
export interface RemoteEntry { file: DriveFile; path: string; dirNames: string[]; dirIds: string[]; status: RemoteStatus; nodeId?: string }
const isMarkdown = (f: DriveFile) => f.mimeType !== FOLDER_MIME && (/\.(md|markdown)$/i.test(f.name) || f.mimeType === "text/markdown");

export async function listRemote(repo: DocumentRepository, session: Session, rootId: string): Promise<{ entries: RemoteEntry[]; ignored: number }> {
  const { api, accountId } = session;
  const nodes = (await repo.list()).filter(n => !n.deletedAt);
  const byFile = new Map((await repo.driveMappings(accountId)).filter(m => m.kind === "document").map(m => [m.fileId, m]));
  const entries: RemoteEntry[] = [];
  let ignored = 0;
  const queue: { id: string; names: string[]; ids: string[] }[] = [{ id: rootId, names: [], ids: [] }];
  for (let visited = 0; queue.length; visited++) {
    if (visited > 2000) throw new DriveError("INVALID", "Drive 폴더가 너무 많아 목록을 모두 읽지 못했습니다.");
    const dir = queue.shift()!;
    for (const file of await api.listChildren(dir.id)) {
      if (file.mimeType === FOLDER_MIME) { queue.push({ id: file.id, names: [...dir.names, file.name], ids: [...dir.ids, file.id] }); continue; }
      if (!isMarkdown(file)) { ignored++; continue; }
      const m = byFile.get(file.id);
      const node = m && nodes.find(n => n.id === m.nodeId);
      let status: RemoteStatus = "new";
      if (m && node) {
        const remoteChanged = file.modifiedTime !== m.remoteModifiedTime && !(file.md5Checksum && file.md5Checksum === m.remoteMd5);
        const localChanged = node.revision !== m.lastSyncedRevision;
        status = !remoteChanged ? "same" : localChanged ? "both-changed" : "remote-changed";
      }
      entries.push({ file, path: [...dir.names, file.name].join("/"), dirNames: dir.names, dirIds: dir.ids, status, nodeId: node?.id });
    }
  }
  return { entries: entries.sort((a, b) => a.path.localeCompare(b.path, "ko", { numeric: true })), ignored };
}

export type PullStrategy = "copy" | "replace";
export interface PullResult { path: string; status: "imported" | "copied" | "replaced" | "skipped" | "failed"; message?: string }
const mdName = (name: string) => { const n = safeFilename(name).replace(/\.markdown$/i, ".md"); return /\.md$/i.test(n) ? n : `${n}.md`; };

/**
 * 선택한 Drive 파일을 가져온다. 새 파일은 새 폴더 'Drive에서 가져옴 …' 안에 만들고 연결하며,
 * 이미 연결된 파일이 Drive에서 바뀌었으면 strategy에 따라 '사본으로 추가(copy)' 또는 '내 문서 본문 교체(replace, 이전 본문은 수정 이력에 남음)'.
 * 정리용 폴더 'Drive에서 가져옴 …'은 Drive의 전용 폴더(rootId)와 연결한다. 그렇지 않으면 다음 올리기에서 이미 있던 Drive 파일이
 * 새 하위 폴더로 옮겨지는 예기치 않은 변화가 생긴다(실제 Drive 검수에서 발견).
 */
export async function pullEntries(repo: DocumentRepository, session: Session, entries: RemoteEntry[], strategy: PullStrategy, rootId: string): Promise<PullResult[]> {
  const { api, accountId } = session;
  const results: PullResult[] = [];
  const contents = new Map<string, string>();
  let aborted = "";
  for (const e of entries) {
    if (e.status === "same") { results.push({ path: e.path, status: "skipped", message: "이미 같은 내용입니다." }); continue; }
    if (aborted) { results.push({ path: e.path, status: "failed", message: `중단됨: ${aborted}` }); continue; }
    try {
      const text = await api.download(e.file.id);
      if (text.length > MAX_MARKDOWN_LENGTH) throw new DocumentError("INVALID", "본문이 너무 깁니다. 문서 한 개는 100만 자까지입니다.");
      if (text.includes("\u0000")) throw new DocumentError("INVALID", "텍스트 파일이 아닌 것 같습니다.");
      contents.set(e.file.id, text.replace(/\r\n?/g, "\n"));
    } catch (err) {
      if (err instanceof DriveError && err.code === "AUTH") aborted = "연결이 만료되었습니다. 다시 연결한 뒤 실패한 항목을 다시 가져와 주세요.";
      results.push({ path: e.path, status: "failed", message: driveMessage(err) });
    }
  }
  const ok = entries.filter(e => contents.has(e.file.id));

  // 본문 교체
  if (strategy === "replace") {
    for (const e of ok.filter(x => x.status !== "new" && x.nodeId)) {
      try {
        const fresh = (await repo.list()).find(n => n.id === e.nodeId && !n.deletedAt);
        if (!fresh) throw new DocumentError("NOT_FOUND", "연결된 내 문서를 찾을 수 없습니다.");
        const updated = await repo.update(fresh.id, fresh.revision, { markdown: contents.get(e.file.id)! });
        await repo.saveDriveMapping({ nodeId: fresh.id, accountId, kind: "document", fileId: e.file.id, parentFileId: e.file.parents?.[0] ?? null, lastSyncedRevision: updated.revision, remoteModifiedTime: e.file.modifiedTime, remoteMd5: e.file.md5Checksum, syncedAt: new Date().toISOString() });
        results.push({ path: e.path, status: "replaced", message: "이전 본문은 수정 이력에서 복원할 수 있습니다." });
      } catch (err) { results.push({ path: e.path, status: "failed", message: driveMessage(err) }); }
      contents.delete(e.file.id);
    }
  }

  // 새 문서(+copy 전략의 사본)는 새 폴더 안에 만든다
  const toImport = ok.filter(e => contents.has(e.file.id));
  if (toImport.length) {
    const wrapperKey = "w";
    const items: ImportItem[] = [{ key: wrapperKey, parentKey: null, kind: "folder", name: `Drive에서 가져옴 ${localDateStamp()}`, markdown: "" }];
    const folderKeys = new Map<string, string>();
    const folderFile = new Map<string, string>(); // 항목 key → Drive 폴더 id
    const docFile = new Map<string, RemoteEntry>();
    for (const e of toImport) {
      let parent = wrapperKey;
      e.dirNames.forEach((dirName, i) => {
        const id = e.dirIds[i];
        let key = folderKeys.get(id);
        if (!key) { key = `f:${id}`; folderKeys.set(id, key); folderFile.set(key, id); items.push({ key, parentKey: parent, kind: "folder", name: safeFilename(dirName), markdown: "" }); }
        parent = key;
      });
      const isCopy = e.status !== "new";
      const base = mdName(e.file.name);
      const key = `${isCopy ? "c" : "d"}:${e.file.id}`;
      docFile.set(key, e);
      items.push({ key, parentKey: parent, kind: "document", name: isCopy ? base.replace(/\.md$/i, " (Drive 사본).md") : base, markdown: contents.get(e.file.id)! });
    }
    try {
      const result = await repo.importTree(items);
      const now = new Date().toISOString();
      await repo.saveDriveMapping({ nodeId: result.ids[wrapperKey], accountId, kind: "folder", fileId: rootId, parentFileId: null, lastSyncedRevision: 1, remoteModifiedTime: now, syncedAt: now });
      for (const [key, fileId] of folderFile) { // 가져온 Drive 폴더는 로컬 폴더와 연결해 다음 업로드에서 재사용
        await repo.saveDriveMapping({ nodeId: result.ids[key], accountId, kind: "folder", fileId, parentFileId: null, lastSyncedRevision: 1, remoteModifiedTime: now, syncedAt: now });
      }
      for (const [key, e] of docFile) {
        if (key.startsWith("d:")) await repo.saveDriveMapping({ nodeId: result.ids[key], accountId, kind: "document", fileId: e.file.id, parentFileId: e.file.parents?.[0] ?? null, lastSyncedRevision: 1, remoteModifiedTime: e.file.modifiedTime, remoteMd5: e.file.md5Checksum, syncedAt: now });
        results.push({ path: e.path, status: key.startsWith("c:") ? "copied" : "imported", ...(key.startsWith("c:") ? { message: "Drive 내용을 사본 문서로 추가했습니다. 내 문서는 바뀌지 않았습니다." } : {}) });
      }
    } catch (err) { for (const e of toImport) results.push({ path: e.path, status: "failed", message: driveMessage(err) }); }
  }
  return results;
}
