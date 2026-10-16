"use client";
// 화면 → 서버 호출 도우미. 실패하면 서버가 보낸 안내 문구로 오류를 던진다(needKey면 설정 화면 안내).
export class ApiError extends Error { constructor(message: string, public needKey = false) { super(message); } }

export async function api<T = Record<string, unknown>>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch { throw new ApiError("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new ApiError(data.error ?? `요청을 처리하지 못했습니다(${res.status}).`, !!data.needKey);
  return data as T;
}

export interface Item<T> { id: string; kind: string; title: string; data: T; created_at: string; updated_at: string }

export type Msg = { text: string; ok?: boolean; needKey?: boolean } | null;
export const toMsg = (e: unknown): Msg => (e instanceof ApiError ? { text: e.message, needKey: e.needKey } : { text: "처리하지 못했습니다. 다시 시도해 주세요." });

export function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "방금"; if (d < 3600) return `${Math.floor(d / 60)}분 전`; if (d < 86400) return `${Math.floor(d / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
