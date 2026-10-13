"use client";
import type { AISuggestion, AspectRatio, BackgroundMode, BeautyAdvice, BeautyType, ImageState, Lang, ModelLevel, SuggestionKind } from "./types";

export class NeedKeyError extends Error {}
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new ApiError("서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.", 0, "network");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (data.needKey) throw new NeedKeyError(String(data.error ?? ""));
  if (!res.ok) throw new ApiError(String(data.error ?? "요청을 처리하지 못했습니다."), res.status, typeof data.code === "string" ? data.code : undefined);
  return data as T;
}

const post = <T,>(path: string, body: unknown, signal?: AbortSignal) =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });

export const api = {
  recommend: (image: ImageState, situation: string, kind: SuggestionKind, model: ModelLevel, signal?: AbortSignal) =>
    post<{ suggestions: AISuggestion[] }>("/api/ai/recommend", { image, situation, kind, model }, signal).then((r) => r.suggestions),
  itemImage: (prompt: string, signal?: AbortSignal) =>
    post<{ image: ImageState }>("/api/ai/item-image", { prompt }, signal).then((r) => r.image),
  itemName: (image: ImageState) => post<{ name: string }>("/api/ai/item-name", { image }).then((r) => r.name),
  tryOn: (p: { base: ImageState; item: ImageState; aspectRatio: AspectRatio; background: BackgroundMode; situation?: string; model: ModelLevel }, signal?: AbortSignal) =>
    post<{ image: ImageState }>("/api/ai/tryon", p, signal).then((r) => r.image),
  beautyAdvice: (image: ImageState, model: ModelLevel, lang: Lang) =>
    post<{ advice: BeautyAdvice }>("/api/ai/beauty-advice", { image, model, lang }).then((r) => r.advice),
  beautyApply: (p: { image: ImageState; type: BeautyType; description: string; aspectRatio: AspectRatio; model: ModelLevel }) =>
    post<{ image: ImageState }>("/api/ai/beauty-apply", p).then((r) => r.image),
  fetchImage: (url: string) =>
    call<{ image: ImageState }>(`/api/fetch-image?url=${encodeURIComponent(url)}`, { method: "GET" }).then((r) => r.image),
};
