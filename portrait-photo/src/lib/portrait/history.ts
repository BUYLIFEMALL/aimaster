"use client";

// 내 기록: 회원 브라우저의 IndexedDB에만 보관한다(서버 저장 없음). 회원별로 DB를 분리하고 최대 20개만 둔다.

export interface HistoryItem {
  id: string;
  createdAt: number;
  purposeLabel: string;
  aspect: string;
  model: string;
  /** 긴 변 900px JPEG data URL */
  thumb: string;
}

export const MAX_HISTORY = 20;
const STORE = "results";

function open(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(`portrait-photo:${userId}`, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function listHistory(userId: string): Promise<HistoryItem[]> {
  try {
    const db = await open(userId);
    const all = await tx<HistoryItem[]>(db, "readonly", (s) => s.getAll());
    db.close();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export async function addHistory(userId: string, item: HistoryItem): Promise<boolean> {
  try {
    const db = await open(userId);
    await tx(db, "readwrite", (s) => s.put(item));
    const all = await tx<HistoryItem[]>(db, "readonly", (s) => s.getAll());
    const extra = all.sort((a, b) => b.createdAt - a.createdAt).slice(MAX_HISTORY);
    for (const e of extra) await tx(db, "readwrite", (s) => s.delete(e.id));
    db.close();
    return true;
  } catch { return false; }
}

export async function removeHistory(userId: string, id: string): Promise<void> {
  try { const db = await open(userId); await tx(db, "readwrite", (s) => s.delete(id)); db.close(); } catch { /* 무시 */ }
}

export async function clearHistory(userId: string): Promise<void> {
  try { const db = await open(userId); await tx(db, "readwrite", (s) => s.clear()); db.close(); } catch { /* 무시 */ }
}
