// v1.13 직접 올린 곡 파일을 이 브라우저(IndexedDB)에만 보관한다 — 서버로 보내지 않는다.
// 열기·읽기가 막힌 환경(시크릿 창 등)에서는 null을 돌려주고 화면은 「다시 올려 주세요」로 안내한다.
const DB = "music_video_studio";
const STORE = "song";
const KEY = "current";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export const saveLocalSong = async (file: Blob): Promise<boolean> => (await run<IDBValidKey>("readwrite", (s) => s.put(file, KEY))) !== null;
export const loadLocalSong = (): Promise<Blob | null> => run<Blob>("readonly", (s) => s.get(KEY));
export const deleteLocalSong = async (): Promise<void> => { await run("readwrite", (s) => s.delete(KEY)); };

/** 오디오 길이(초) — 못 읽으면 null */
export function audioDuration(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = "metadata";
    const done = (v: number | null) => { a.src = ""; resolve(v); };
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? Math.round(a.duration) : null);
    a.onerror = () => done(null);
    setTimeout(() => done(null), 10_000);
    a.src = src;
  });
}
