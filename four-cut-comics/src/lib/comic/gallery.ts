// [내 작품] — 완성작을 이 브라우저의 IndexedDB에 회원별로 최근 MAX_WORKS개 보관한다(서버 저장 없음).
import { MAX_WORKS, trimWorks } from "./extras";
import type { Script } from "./script";

export interface Work {
  id: string;
  createdAt: number;
  title: string; // 주제(없으면 첫 컷 대사)
  episode: number; // 이어서 만들기 회차(1부터)
  styleId: string;
  script: Script;
  image: string; // 바둑판(2x2) JPEG 데이터 URL
}

const STORE = "works";
const dbName = (userId: string) => `four-cut-comics-${userId}`;

function open(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("이 브라우저는 작품 보관을 지원하지 않습니다.")); return; }
    const req = indexedDB.open(dbName(userId), 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error("작품 보관함을 열지 못했습니다."));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.name === "QuotaExceededError" ? "브라우저 저장 공간이 부족합니다. 오래된 작품을 지워 주세요." : "작품을 저장하지 못했습니다."));
    tx.onabort = () => reject(new Error("작품 저장이 취소되었습니다."));
  });
}

export async function listWorks(userId: string): Promise<Work[]> {
  const db = await open(userId);
  try {
    const all = await new Promise<Work[]>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Work[]);
      req.onerror = () => reject(new Error("작품 목록을 읽지 못했습니다."));
    });
    return trimWorks(all, Number.MAX_SAFE_INTEGER).keep;
  } finally { db.close(); }
}

/** 새 작품 저장 후 최신 MAX_WORKS개만 남긴다(넘치면 가장 오래된 것부터 삭제) */
export async function saveWork(userId: string, w: Omit<Work, "id" | "createdAt">): Promise<{ work: Work; dropped: number }> {
  const work: Work = { ...w, id: crypto.randomUUID(), createdAt: Date.now() };
  const db = await open(userId);
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(work);
    const all = await new Promise<Work[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as Work[]);
      req.onerror = () => reject(new Error("작품 목록을 읽지 못했습니다."));
    });
    const { drop } = trimWorks(all, MAX_WORKS);
    drop.forEach((id) => store.delete(id));
    await done(tx);
    return { work, dropped: drop.length };
  } finally { db.close(); }
}

export async function deleteWork(userId: string, id: string): Promise<void> {
  const db = await open(userId);
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await done(tx);
  } finally { db.close(); }
}
