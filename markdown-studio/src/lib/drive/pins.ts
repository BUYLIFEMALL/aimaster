// v1.17: Google Drive 동기화에 대시보드 고정·색깔 꼬리표·꼬리표 이름을 함께 싣는다.
// Drive 전용 폴더에 작은 설정 파일 하나(PINS_FILE)를 두고, 문서는 기기마다 다른 내부 id 대신 Drive 파일 id로 가리킨다.
// 원칙: 올릴 때는 이 기기의 고정 정보로 파일을 갱신(마지막에 올린 기기 기준), 가져올 때는 지금 설정에 더한다(지금 고정 먼저·이미 붙인 이름 유지).
import { sanitizePinColors, sanitizePinNames, type DriveMapping, type WorkspacePreferences } from "../documents/model";
import type { BackupPins } from "../documents/backup";
import type { DriveApi } from "./api";

export const PINS_FILE = ".markdown-studio-pins.json";
const PINS_FORMAT = "aimaster-markdown-studio-pins";

type Prefs = Pick<WorkspacePreferences, "pinnedIds" | "pinColors" | "pinNames">;

/** 이 기기의 고정 정보를 Drive 파일 id 기준으로 바꾼다(Drive와 연결된 문서만) */
export function buildDrivePins(prefs: Prefs, mappings: DriveMapping[]): string {
  const fileOf = new Map(mappings.filter(m => m.kind === "document").map(m => [m.nodeId, m.fileId]));
  const pinned = (prefs.pinnedIds ?? []).filter(id => fileOf.has(id));
  const colors: Record<string, string> = {};
  for (const [id, color] of Object.entries(sanitizePinColors(prefs.pinColors, pinned))) colors[fileOf.get(id)!] = color;
  return JSON.stringify({ format: PINS_FORMAT, version: 1, pinnedFileIds: pinned.map(id => fileOf.get(id)!), colors, names: sanitizePinNames(prefs.pinNames) });
}

/** Drive 설정 파일을 읽는다. 형식이 다르거나 깨져 있으면 빈 값(문서 동기화는 그대로) */
export function parseDrivePins(text: string): BackupPins {
  const empty: BackupPins = { pinnedIds: [], pinColors: {}, pinNames: {} };
  let root: unknown;
  try { root = JSON.parse(text); } catch { return empty; }
  if (!root || typeof root !== "object" || (root as Record<string, unknown>).format !== PINS_FORMAT) return empty;
  const r = root as Record<string, unknown>;
  const pinnedIds = Array.isArray(r.pinnedFileIds) ? [...new Set(r.pinnedFileIds.filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(id)))].slice(0, 50) : [];
  return { pinnedIds, pinColors: sanitizePinColors(r.colors, pinnedIds), pinNames: sanitizePinNames(r.names) };
}

/** Drive 파일 id → 이 기기 문서 id (mergeRestoredPins에 넘길 연결표) */
export const fileToNodeMap = (mappings: DriveMapping[]) =>
  Object.fromEntries(mappings.filter(m => m.kind === "document").map(m => [m.fileId, m.nodeId])) as Record<string, string>;

/** Drive 전용 폴더의 고정 정보 파일을 이 기기 내용으로 만들거나 갱신한다 */
export async function saveDrivePins(api: DriveApi, rootId: string, prefs: Prefs, mappings: DriveMapping[]) {
  const content = buildDrivePins(prefs, mappings);
  const existing = await api.findFile(rootId, PINS_FILE);
  if (existing) await api.updateFile(existing.id, PINS_FILE, content);
  else await api.createFile(rootId, PINS_FILE, content, "application/json");
}

/** Drive의 고정 정보 파일을 읽는다(없으면 null) */
export async function loadDrivePins(api: DriveApi, rootId: string): Promise<BackupPins | null> {
  const file = await api.findFile(rootId, PINS_FILE);
  if (!file) return null;
  return parseDrivePins(await api.download(file.id));
}
