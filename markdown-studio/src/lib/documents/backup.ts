// 가져오기·백업·복원의 순수 로직. 악성/과대/깨진 입력은 저장 전에 차단하고, 모두 새 항목으로 만든다(기존 문서를 덮어쓰지 않음).
import {
  DocumentError, MAX_MARKDOWN_LENGTH, normalizeName, safeFilename, sanitizePinColors, sanitizePinNames,
  type DocumentNode, type NodeKind, type PinColor, type WorkspacePreferences,
} from "./model";

export const BACKUP_FORMAT = "aimaster-markdown-studio-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_NODES = 5000;
export const MAX_DEPTH = 30;
export const TEXT_EXTENSIONS = /\.(md|markdown|txt)$/i;

export interface ImportItem { key: string; parentKey: string | null; kind: NodeKind; name: string; markdown: string }

// ---- 백업 만들기 ----
export function buildBackup(nodes: DocumentNode[], now = new Date(), prefs?: Pick<WorkspacePreferences, "pinnedIds" | "pinColors" | "pinNames">): string {
  const live = nodes.filter(n => !n.deletedAt);
  const liveIds = new Set(live.map(n => n.id));
  // v1.16: 대시보드 고정 목록·색깔 꼬리표·꼬리표 이름도 함께(살아 있는 문서 것만). 옛 프로그램은 이 칸을 무시하고 문서만 복원한다
  const docIds = new Set(live.filter(n => n.kind === "document").map(n => n.id));
  const pinnedIds = (prefs?.pinnedIds ?? []).filter(id => docIds.has(id));
  return JSON.stringify({
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), app: "markdown-studio",
    note: "문서와 폴더의 이름·본문·구조, 대시보드 고정·색깔 꼬리표를 포함합니다. 수정 이력·휴지통·로그인 정보는 포함하지 않습니다.",
    nodes: live.map(n => ({
      id: n.id, kind: n.kind, parentId: n.parentId && liveIds.has(n.parentId) ? n.parentId : null,
      name: n.name, markdown: n.kind === "document" ? n.markdown : "", updatedAt: n.updatedAt,
    })),
    pins: { pinnedIds, pinColors: sanitizePinColors(prefs?.pinColors, pinnedIds), pinNames: sanitizePinNames(prefs?.pinNames) },
  });
}

export interface BackupPins { pinnedIds: string[]; pinColors: Record<string, PinColor>; pinNames: Partial<Record<PinColor, string>> }
/** v1.16: 백업의 고정·꼬리표 정보(없거나 깨져 있으면 빈 값 — 문서 복원은 그대로 진행). 백업 안 문서를 가리키는 것만 남긴다 */
export function parseBackupPins(text: string, items: ImportItem[]): BackupPins {
  const empty: BackupPins = { pinnedIds: [], pinColors: {}, pinNames: {} };
  let root: unknown;
  try { root = JSON.parse(text); } catch { return empty; }
  const pins = root && typeof root === "object" ? (root as Record<string, unknown>).pins : null;
  if (!pins || typeof pins !== "object") return empty;
  const p = pins as Record<string, unknown>;
  const docKeys = new Set(items.filter(i => i.kind === "document").map(i => i.key));
  const pinnedIds = Array.isArray(p.pinnedIds) ? [...new Set(p.pinnedIds.filter((id): id is string => typeof id === "string" && docKeys.has(id)))].slice(0, 50) : [];
  return { pinnedIds, pinColors: sanitizePinColors(p.pinColors, pinnedIds), pinNames: sanitizePinNames(p.pinNames) };
}

/**
 * v1.16: 복원한 문서의 새 id로 고정·꼬리표를 옮겨 지금 설정에 더한다.
 * 지금 고정한 것이 먼저(최대 50개), 이미 붙인 꼬리표 이름은 덮어쓰지 않고 비어 있는 색만 채운다.
 */
export function mergeRestoredPins(current: Pick<WorkspacePreferences, "pinnedIds" | "pinColors" | "pinNames">, pins: BackupPins, idMap: Record<string, string>) {
  const restored = pins.pinnedIds.map(id => idMap[id]).filter((id): id is string => !!id);
  const pinnedIds = [...new Set([...(current.pinnedIds ?? []), ...restored])].slice(0, 50);
  const pinColors: Record<string, PinColor> = { ...(current.pinColors ?? {}) };
  for (const [oldId, color] of Object.entries(pins.pinColors)) { const id = idMap[oldId]; if (id && pinnedIds.includes(id)) pinColors[id] = color; }
  const pinNames = { ...pins.pinNames, ...sanitizePinNames(current.pinNames) };
  return { pinnedIds, pinColors: sanitizePinColors(pinColors, pinnedIds), pinNames, restoredPins: restored.filter(id => pinnedIds.includes(id)).length };
}

// ---- 백업 읽기·검증 ----
const bad = (msg: string) => new DocumentError("INVALID", msg);
export function parseBackup(text: string): ImportItem[] {
  if (text.length > MAX_BACKUP_BYTES) throw bad("백업 파일이 너무 큽니다. 50MB 이하만 복원할 수 있습니다.");
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw bad("JSON 형식이 올바르지 않습니다. 이 프로그램에서 만든 백업 파일인지 확인해 주세요."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw bad("백업 파일 형식이 아닙니다.");
  const root = data as Record<string, unknown>;
  if (root.format !== BACKUP_FORMAT) throw bad("이 프로그램에서 만든 백업 파일이 아닙니다.");
  if (root.version !== BACKUP_VERSION) throw bad("지원하지 않는 백업 버전입니다. 최신 버전의 프로그램에서 만든 파일인지 확인해 주세요.");
  if (!Array.isArray(root.nodes)) throw bad("백업 파일에 문서 목록이 없습니다.");
  if (root.nodes.length > MAX_IMPORT_NODES) throw bad(`한 번에 ${MAX_IMPORT_NODES.toLocaleString()}개까지 복원할 수 있습니다.`);
  const items = new Map<string, ImportItem>();
  root.nodes.forEach((raw, index) => {
    const at = `${index + 1}번째 항목`;
    if (!raw || typeof raw !== "object") throw bad(`${at}이 올바르지 않습니다.`);
    const n = raw as Record<string, unknown>;
    if (typeof n.id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(n.id)) throw bad(`${at}의 식별자가 올바르지 않습니다.`);
    if (items.has(n.id)) throw bad(`${at}의 식별자가 중복되었습니다.`);
    if (n.kind !== "document" && n.kind !== "folder") throw bad(`${at}의 종류가 올바르지 않습니다.`);
    if (typeof n.name !== "string") throw bad(`${at}의 이름이 올바르지 않습니다.`);
    let name: string;
    try { name = normalizeName(n.name); } catch { throw bad(`${at}의 이름이 올바르지 않습니다. 이름은 경로 문자 없이 1~120자여야 합니다.`); }
    const markdown = n.kind === "document" ? n.markdown : "";
    if (typeof markdown !== "string") throw bad(`${at}의 본문이 올바르지 않습니다.`);
    if (markdown.length > MAX_MARKDOWN_LENGTH) throw bad(`${at}의 본문이 너무 깁니다. 문서 한 개는 100만 자까지입니다.`);
    if (n.parentId !== null && n.parentId !== undefined && typeof n.parentId !== "string") throw bad(`${at}의 상위 폴더가 올바르지 않습니다.`);
    items.set(n.id, { key: n.id, parentKey: (n.parentId as string | null | undefined) ?? null, kind: n.kind, name, markdown });
  });
  validateTree([...items.values()]);
  return [...items.values()];
}

/** 부모 존재·폴더 여부·순환·깊이 검사 */
export function validateTree(items: ImportItem[]) {
  const byKey = new Map(items.map(i => [i.key, i]));
  for (const item of items) {
    let depth = 0;
    const seen = new Set([item.key]);
    for (let p = item.parentKey; p; ) {
      const parent = byKey.get(p);
      if (!parent) throw bad(`'${item.name}'의 상위 폴더가 백업에 없습니다.`);
      if (parent.kind !== "folder") throw bad(`'${item.name}'의 상위 항목이 폴더가 아닙니다.`);
      if (seen.has(p)) throw bad("폴더 구조가 순환되어 복원할 수 없습니다.");
      seen.add(p);
      if (++depth > MAX_DEPTH) throw bad(`폴더가 ${MAX_DEPTH}단계보다 깊어 복원할 수 없습니다.`);
      p = parent.parentKey;
    }
  }
}

/** 복원 항목들을 새 폴더 하나 안으로 모은다 (기존 항목과 섞이지 않게) */
export function wrapInFolder(items: ImportItem[], folderName: string): ImportItem[] {
  const key = "__restore_root__";
  return [{ key, parentKey: null, kind: "folder", name: folderName, markdown: "" }, ...items.map(i => ({ ...i, parentKey: i.parentKey ?? key }))];
}

// ---- 텍스트 파일 ----
/** UTF-8로 해석하고, 안 되면 한국어 Windows 문서에 흔한 EUC-KR(CP949)로 해석한다 */
export function decodeText(bytes: ArrayBuffer | Uint8Array): { text: string; encoding: "utf-8" | "euc-kr" } {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let encoding: "utf-8" | "euc-kr" = "utf-8";
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(view); }
  catch { text = new TextDecoder("euc-kr").decode(view); encoding = "euc-kr"; }
  return { text: text.replace(/^﻿/, "").replace(/\r\n?/g, "\n"), encoding };
}

export interface FileInput { path: string; bytes: ArrayBuffer | Uint8Array }
export interface ImportReport { items: ImportItem[]; imported: number; skipped: string[]; errors: { name: string; error: string }[]; notes: string[] }

/** 파일 목록(폴더 가져오기면 상대 경로 포함)을 폴더·문서 항목으로 바꾼다. 문제가 있는 파일은 건너뛰고 이유를 기록한다 */
export function itemsFromFiles(files: FileInput[]): ImportReport {
  const report: ImportReport = { items: [], imported: 0, skipped: [], errors: [], notes: [] };
  const folders = new Map<string, string>(); // 경로 → 키
  const folderKey = (segments: string[]): string | null => {
    let parent: string | null = null;
    let path = "";
    for (const raw of segments) {
      path += `/${raw}`;
      let key = folders.get(path);
      if (!key) {
        key = `f${folders.size + 1}`;
        folders.set(path, key);
        report.items.push({ key, parentKey: parent, kind: "folder", name: normalizeName(safeFilename(raw)), markdown: "" });
      }
      parent = key;
    }
    return parent;
  };
  for (const file of files) {
    const segments = file.path.split(/[\\/]/).filter(Boolean);
    const filename = segments.pop() ?? "";
    if (segments.some(s => s.startsWith(".")) || filename.startsWith(".")) { report.skipped.push(`${file.path} (숨김 파일)`); continue; }
    if (!TEXT_EXTENSIONS.test(filename)) { report.skipped.push(`${file.path} (지원하지 않는 형식)`); continue; }
    const size = file.bytes.byteLength;
    if (size > MAX_FILE_BYTES) { report.errors.push({ name: file.path, error: "파일이 너무 큽니다. 5MB 이하만 가져올 수 있습니다." }); continue; }
    if (report.items.length >= MAX_IMPORT_NODES) { report.errors.push({ name: file.path, error: `한 번에 ${MAX_IMPORT_NODES.toLocaleString()}개까지 가져올 수 있습니다.` }); continue; }
    const { text, encoding } = decodeText(file.bytes);
    if (text.includes("\u0000")) { report.errors.push({ name: file.path, error: "텍스트 파일이 아닌 것 같습니다." }); continue; }
    if (text.length > MAX_MARKDOWN_LENGTH) { report.errors.push({ name: file.path, error: "본문이 너무 깁니다. 문서 한 개는 100만 자까지입니다." }); continue; }
    let name: string;
    try { name = normalizeName(safeFilename(filename.replace(/\.(markdown|txt)$/i, ".md"))); } catch (e) { report.errors.push({ name: file.path, error: (e as Error).message }); continue; }
    if (!/\.md$/i.test(name)) name = `${name}.md`;
    report.items.push({ key: `d${report.items.length + 1}`, parentKey: folderKey(segments), kind: "document", name, markdown: text });
    report.imported++;
    if (encoding === "euc-kr") report.notes.push(`${file.path}: UTF-8이 아니어서 EUC-KR(한국어 Windows 인코딩)로 해석했습니다. 글자가 깨졌다면 UTF-8로 저장해 다시 가져오세요.`);
    if (/\.txt$/i.test(filename)) report.notes.push(`${file.path}: 텍스트 파일을 마크다운 문서(.md)로 가져왔습니다.`);
  }
  return report;
}

// ---- 이름 충돌 ----
/** 같은 폴더에 같은 이름이 있으면 (2), (3)을 붙여 겹치지 않게 한다. 확장자는 유지 */
export function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name.toLocaleLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let n = 2; ; n++) {
    const suffix = ` (${n})${ext}`;
    const candidate = `${stem.slice(0, 120 - suffix.length)}${suffix}`;
    if (!taken.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

/** 부모가 먼저 오도록 정렬 */
export function orderParentsFirst(items: ImportItem[]): ImportItem[] {
  const byKey = new Map(items.map(i => [i.key, i]));
  const depth = (i: ImportItem): number => { let d = 0; for (let p = i.parentKey; p; p = byKey.get(p)?.parentKey ?? null) d++; return d; };
  return items.slice().sort((a, b) => depth(a) - depth(b));
}
