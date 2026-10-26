// E5-2(2026-10-26) 「🧰 무료 이미지 도구」 결과 → 「🖼 사진 일괄 손질」 넘기기 — 브라우저 안 임시 보관(IndexedDB). 서버로 보내지 않는다.
// 보내는 쪽이 파일을 넣고 /batch?from=tools 로 이동하면, 받는 쪽이 꺼내 넣고 바로 지운다(한 번만 쓰는 보관).

const DB = "bnc-handoff";
const STORE = "files";
const KEY = "tools-to-batch";
/** 넘긴 지 이 시간이 지난 보관분은 받지 않고 지운다(다른 날 남은 찌꺼기 방지) */
export const HANDOFF_TTL_MS = 10 * 60 * 1000;
export const BATCH_FROM_TOOLS = "/batch?from=tools";

interface Saved { at: number; files: { name: string; blob: Blob }[] }

function open(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}
function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then((db) => new Promise<T>((ok, no) => {
    const t = db.transaction(STORE, mode), req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); ok(req.result as T); };
    t.onerror = () => { db.close(); no(t.error); };
  }));
}

export async function putForBatch(files: { name: string; blob: Blob }[]): Promise<void> {
  await tx("readwrite", (s) => s.put({ at: Date.now(), files } satisfies Saved, KEY));
}

/** 꺼내고 바로 지운다. 없거나 오래됐으면 빈 목록 */
export async function takeForBatch(now = Date.now()): Promise<File[]> {
  const saved = await tx<Saved | undefined>("readonly", (s) => s.get(KEY));
  await tx("readwrite", (s) => s.delete(KEY));
  return isFresh(saved, now) ? saved!.files.map((f) => new File([f.blob], f.name, { type: f.blob.type })) : [];
}

export const isFresh = (saved: { at: number } | undefined, now: number) => !!saved && now - saved.at >= 0 && now - saved.at < HANDOFF_TTL_MS;

/** 모델 준비 단계 문구 — 받기(MB 표시) → 계산 준비 → (계산은 부르는 쪽) */
export function prepareText(label: string, loaded: number, total: number): string {
  const mb = (v: number) => (v / 1048576).toFixed(1);
  if (total > 0 && loaded >= total) return `${label} 계산 준비 중… (처음 한 번은 몇 초 더 걸립니다)`;
  return `${label} 모델 받는 중 ${mb(loaded)}/${mb(total)}MB (처음 한 번만)`;
}
