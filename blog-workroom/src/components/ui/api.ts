"use client";
// 화면 → 서버 호출 도우미. 실패하면 서버가 보낸 안내 문구로 오류를 던진다(needKey면 설정 화면 안내).
export class ApiError extends Error { constructor(message: string, public needKey = false, public data: Record<string, unknown> = {}) { super(message); } }

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new ApiError(data.error ?? `요청을 처리하지 못했습니다(${res.status}).`, !!data.needKey, data);
  return data as T;
}

export async function run<T = unknown>(action: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try { res = await fetch(`/api/run/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { throw new ApiError("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."); }
  return (await parse<{ result: T }>(res)).result;
}

export interface Item<T> { id: string; kind: string; title: string; data: T; ref_id: string | null; created_at: string; updated_at: string }

export async function listItems<T>(kind: string, ref?: string): Promise<Item<T>[]> {
  const res = await fetch(`/api/items?kind=${kind}${ref ? `&ref=${ref}` : ""}`, { cache: "no-store" });
  return (await parse<{ items: Item<T>[] }>(res)).items;
}
export async function getItem<T>(id: string): Promise<Item<T>> {
  return (await parse<{ item: Item<T> }>(await fetch(`/api/items?id=${id}`, { cache: "no-store" }))).item;
}
export async function saveItem<T>(id: string, patch: { title?: string; data?: T }): Promise<Item<T>> {
  const res = await fetch("/api/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) });
  return (await parse<{ item: Item<T> }>(res)).item;
}
export async function deleteItem(id: string): Promise<void> {
  await parse(await fetch(`/api/items?id=${id}`, { method: "DELETE" }));
}
