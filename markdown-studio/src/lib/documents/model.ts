export type NodeKind = "document" | "folder";
export interface DocumentNode {
  id: string;
  userId: string;
  kind: NodeKind;
  parentId: string | null;
  name: string;
  markdown: string;
  revision: number;
  updatedAt: string;
  deletedAt: string | null;
  trashBatchId: string | null;
}
export interface DocumentRevision {
  key: string;
  nodeId: string;
  userId: string;
  revision: number;
  name: string;
  markdown: string;
  savedAt: string;
}
export interface WorkspacePreferences {
  activeId: string | null;
  explorerOpen: boolean;
  editorPercent: number;
}
export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  activeId: null, explorerOpen: true, editorPercent: 50,
};
/** Google Drive와 연결된 문서·폴더의 기록(이 기기 IndexedDB에만 저장). Drive 계정별로 구분한다 */
export interface DriveMapping {
  nodeId: string;
  accountId: string;
  kind: NodeKind;
  fileId: string;
  parentFileId: string | null;
  lastSyncedRevision: number;
  remoteModifiedTime: string;
  remoteMd5?: string;
  syncedAt: string;
}
export const MAX_MARKDOWN_LENGTH = 1_000_000;
export class DocumentError extends Error {
  constructor(public code: "INVALID" | "OWNER" | "CONFLICT" | "NOT_FOUND" | "DUPLICATE", message: string) {
    super(message); this.name = "DocumentError";
  }
}
export function normalizeName(raw: string): string {
  const name = raw.normalize("NFC").trim();
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f/\\]/.test(name) || name === "." || name === "..") {
    throw new DocumentError("INVALID", "이름은 경로 문자 없이 1~120자로 입력해 주세요.");
  }
  return name;
}
export function verifyOwner(node: DocumentNode, userId: string) {
  if (node.userId !== userId) throw new DocumentError("OWNER", "본인 문서만 사용할 수 있습니다.");
}
export function descendants(nodes: DocumentNode[], id: string): Set<string> {
  const result = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const node of nodes) if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
      result.add(node.id); grew = true;
    }
  }
  return result;
}
export function validatePlacement(nodes: DocumentNode[], userId: string, id: string | null, parentId: string | null, name: string) {
  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent || parent.deletedAt || parent.kind !== "folder") throw new DocumentError("INVALID", "대상 폴더를 찾을 수 없습니다.");
    verifyOwner(parent, userId);
    if (id && descendants(nodes, id).has(parentId)) throw new DocumentError("INVALID", "자신 또는 하위 폴더로 이동할 수 없습니다.");
  }
  if (nodes.some(n => !n.deletedAt && n.id !== id && n.parentId === parentId && n.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new DocumentError("DUPLICATE", "이 폴더에 같은 이름이 있습니다. 다른 이름을 입력해 주세요.");
  }
}
export function searchNodes(nodes: DocumentNode[], query: string, includeContent = false) {
  const text = query.normalize("NFC").toLocaleLowerCase();
  return nodes.filter(n => !n.deletedAt && (n.name.toLocaleLowerCase().includes(text) || (includeContent && n.markdown.toLocaleLowerCase().includes(text))));
}
export function safeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 120) || "문서";
}
