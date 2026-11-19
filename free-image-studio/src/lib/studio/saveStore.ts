// 그림 저장 기록(브라우저 보관, 회원별) — 같은 그림을 두 번 저장하지 않게 한다. 그림 자체는 서버에 올리지 않는다.
import { EngineError, type KeyValueStore } from "../engine.ts";
import { defaultLock, type Lock } from "./lock.ts";

// 탭 사이 잠금이 없는 브라우저에서는 **다른 탭에서 동시에** 같은 그림을 저장하면 두 번 쓰일 수 있다
// (같은 탭 안에서는 막힌다. 폴더 저장은 같은 이름이라 한 파일로 덮어쓰이지만, 내려받기는 파일이 둘 생길 수 있다).
// 화면은 hasCrossTabLock()이 false면 그 제약을 알린다.
export { hasCrossTabLock, type Lock } from "./lock.ts";

export type SavedInfo = { name: string; at: number };
/** 받은 그림을 실제로 쓰는 함수(폴더에 쓰기 또는 내려받기). 화면이 넣어 준다 */
export type Writer = (name: string, blob: Blob) => Promise<void>;

const key = (memberId: string) => `fis.saved.v1:${memberId}`;
const SAVED_MAX = 500;

/** 파일 이름 — 접수 번호가 들어가 같은 그림은 항상 같은 이름이다(폴더에 다시 써도 한 파일) */
export function fileNameFor(row: { requestId: string; title: string; width?: number; height?: number }): string {
  const title = row.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, "-").slice(0, 40) || "image";
  const size = row.width && row.height ? `-${row.width}x${row.height}` : "";
  return `${title}${size}-${row.requestId.replace(/[^A-Za-z0-9]/g, "").slice(0, 8)}.png`;
}

export function createSaveStore(storage: KeyValueStore, memberId: string, opts: { lock?: Lock } = {}) {
  const lock = opts.lock ?? defaultLock;
  if (!/^[A-Za-z0-9-]{8,64}$/.test(memberId)) throw new EngineError("invalid", "회원 번호가 없어 저장 기록을 만들 수 없습니다.");
  const saving = new Set<string>();
  const read = (): Record<string, SavedInfo> => {
    try {
      const data: unknown = JSON.parse(storage.getItem(key(memberId)) ?? "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, SavedInfo>) : {};
    } catch {
      return {};
    }
  };
  return {
    /** 이 접수 번호의 그림을 저장한 기록 */
    savedInfo: (requestId: string): SavedInfo | null => read()[requestId] ?? null,
    all: read,
    isSaving: (requestId: string) => saving.has(requestId),

    /**
     * 그림을 한 번만 저장한다. 「저장했는지 읽기 → 그림 받기 → 쓰기 → 기록」 전체를 회원·접수 번호별 잠금 안에서 한다 —
     * 같은 화면에서 두 번 누르거나 다른 탭에서 동시에 눌러도 하나가 끝난 뒤 다음이 기록을 보고 쓰지 않는다.
     * - 이미 저장한 그림이면 쓰지 않고 그 기록을 돌려준다(force면 같은 이름으로 다시 쓴다 — 사용자가 「다시 저장」을 고른 경우).
     * - 쓰기에 실패하면 기록을 남기지 않는다.
     */
    async saveOnce(row: { requestId: string; title: string; width?: number; height?: number }, load: () => Promise<Blob>, write: Writer, opts: { force?: boolean; now?: () => number } = {}): Promise<{ saved: boolean; info: SavedInfo }> {
      saving.add(row.requestId);
      try {
        return await lock(`fis.save:${memberId}:${row.requestId}`, async () => {
          const before = read()[row.requestId];
          if (before && !opts.force) return { saved: false, info: before };
          const blob = await load();
          const name = before?.name ?? fileNameFor(row);
          await write(name, blob);
          const info = { name, at: (opts.now ?? Date.now)() };
          const all = read();
          all[row.requestId] = info;
          const ids = Object.keys(all);
          if (ids.length > SAVED_MAX) for (const id of ids.sort((a, b) => all[a].at - all[b].at).slice(0, ids.length - SAVED_MAX)) delete all[id];
          try {
            storage.setItem(key(memberId), JSON.stringify(all));
          } catch {
            // 그림은 이미 저장됐다. 기록만 못 남겼으므로 알려 준다(다음에 또 저장될 수 있다 — 같은 이름이라 폴더에서는 덮어쓴다).
            throw new EngineError("storage", `그림은 저장했지만(${name}) 저장 기록을 적지 못했습니다.`);
          }
          return { saved: true, info };
        });
      } finally {
        saving.delete(row.requestId);
      }
    },

    /** 접수 기록을 지울 때 저장 기록도 지운다 */
    forget(requestId: string) {
      const all = read();
      if (!(requestId in all)) return;
      delete all[requestId];
      try {
        storage.setItem(key(memberId), JSON.stringify(all));
      } catch {}
    },
  };
}

export type SaveStore = ReturnType<typeof createSaveStore>;
