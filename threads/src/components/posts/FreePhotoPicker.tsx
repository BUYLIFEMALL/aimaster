"use client";

import { useState } from "react";
import { PHOTO_PROVIDERS, type Photo, type PhotoProvider } from "@/lib/photoSearch";

/**
 * v1.29: 글 첨부 이미지에 무료 사진(회원 본인 Pixabay·Pexels 키). 고르면 서버(/api/photos)가 post-images/<회원>/ 에 저장한 주소를 넘긴다.
 * 이 컴포넌트는 글 작성 <form> 안에 들어가므로 검색어 Enter는 반드시 preventDefault(새 글 제출·AI 자동 생성 방지, INSTA v1.65 사고).
 */
export function FreePhotoPicker({ defaultQuery, disabled, remaining, onPicked }: { defaultQuery: string; disabled?: boolean; remaining: number; onPicked: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<PhotoProvider>("pixabay");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "사진을 처리하지 못했습니다."), { needKey: !!data.needApiKey });
    return data;
  };

  const search = async () => {
    const q = (query || defaultQuery).trim();
    if (!q || busy) return;
    if (!query) setQuery(q);
    setBusy("search");
    setError(null);
    try {
      setPhotos(((await call({ action: "search", provider, query: q })).photos as Photo[]) ?? []);
    } catch (e) {
      setError({ message: (e as Error).message, needKey: (e as { needKey?: boolean }).needKey });
    } finally {
      setBusy(null);
    }
  };

  const pick = async (photo: Photo) => {
    if (busy || remaining <= 0) return;
    setBusy(photo.id);
    setError(null);
    try {
      onPicked((await call({ action: "pick", url: photo.url })).url as string);
    } catch (e) {
      setError({ message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return (
      <button type="button" data-free-photo-open disabled={disabled || remaining <= 0} onClick={() => setOpen(true)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
        📷 무료 사진으로 추가 (Pixabay·Pexels)
      </button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-free-photo>
      <div className="flex gap-2">
        <select aria-label="사진 제공처" value={provider} onChange={(e) => setProvider(e.target.value as PhotoProvider)} className="w-28 shrink-0 rounded-lg border border-neutral-300 px-2 py-2 text-sm text-neutral-700">
          {PHOTO_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          aria-label="사진 검색어"
          value={query}
          maxLength={100}
          placeholder={defaultQuery ? `비워두면 「${defaultQuery.slice(0, 20)}」로 검색` : "예: 커피, office, 바다"}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void search();
          }}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
        />
        <button type="button" aria-label="사진 검색" disabled={!!busy || !(query || defaultQuery).trim()} onClick={() => void search()} className="shrink-0 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy === "search" ? "검색 중…" : "검색"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">본인 {provider === "pixabay" ? "Pixabay" : "Pexels"} 키로 검색합니다(무료). 누르면 이미지 목록에 추가됩니다(남은 {remaining}장).</p>
      {error && (
        <p className="text-xs text-red-600">
          {error.message}
          {error.needKey && (
            <>
              {" "}
              <a href="/settings" className="underline">설정으로 가기</a>
            </>
          )}
        </p>
      )}
      {photos && photos.length === 0 && <p className="text-xs text-neutral-500">검색 결과가 없습니다. 다른 검색어로 찾아보세요.</p>}
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((p) => (
            <button key={p.id} type="button" disabled={!!busy || remaining <= 0} onClick={() => void pick(p)} title={`${p.author} · ${p.source === "pixabay" ? "Pixabay" : "Pexels"}`} className="relative aspect-[4/5] overflow-hidden rounded-md border border-neutral-200 hover:border-neutral-900 disabled:opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
              <span data-photo-source className="absolute left-1 top-1 rounded bg-black/70 px-1 py-px text-[9px] font-bold text-white">{p.source === "pixabay" ? "Pixabay" : "Pexels"}</span>
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-white">{p.author}</span>
              {busy === p.id && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">추가 중…</span>}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-900">
        접기
      </button>
    </div>
  );
}
