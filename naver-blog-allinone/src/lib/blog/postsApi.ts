"use client";

// 보관함 API 호출 도우미(브라우저). 모든 호출은 로그인·이용 권한이 있는 회원 본인 것만 다룬다(서버에서 확인).
import type { BlogPost, SavedPost, SavedPostSummary } from "./types";

async function parse<T>(res: Response, fallback: string): Promise<T> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* JSON이 아닌 응답은 아래에서 일반 오류로 처리 */
  }
  if (!res.ok) throw new Error((data as { error?: string } | null)?.error || fallback);
  return data as T;
}

export async function savePost(post: BlogPost, id?: string | null): Promise<SavedPost> {
  const res = await fetch(id ? `/api/posts/${id}` : "/api/posts", {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  return (await parse<{ post: SavedPost }>(res, "글을 저장하지 못했습니다.")).post;
}

export async function listPosts(): Promise<SavedPostSummary[]> {
  const res = await fetch("/api/posts", { cache: "no-store" });
  return (await parse<{ posts: SavedPostSummary[] }>(res, "보관함을 불러오지 못했습니다.")).posts;
}

export async function getPost(id: string): Promise<SavedPost> {
  const res = await fetch(`/api/posts/${id}`, { cache: "no-store" });
  return (await parse<{ post: SavedPost }>(res, "저장된 글을 불러오지 못했습니다.")).post;
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
  await parse<{ success: boolean }>(res, "삭제하지 못했습니다.");
}

export async function uploadImage(dataUrl: string): Promise<string> {
  const res = await fetch("/api/posts/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  return (await parse<{ url: string }>(res, "이미지를 저장하지 못했습니다.")).url;
}
