"use client";

import { useState } from "react";
import { Camera, Loader2, Search } from "lucide-react";
import { PHOTO_PROVIDERS, type Photo, type PhotoProvider } from "@/lib/cardnews/photoSearch";
import type { RatioId } from "@/lib/cardnews/presets";
import { BTN_GHOST, ErrorNote, INPUT, SELECT } from "@/components/cardnews/studio/ui";

// 공용 입력 클래스의 w-full이 좁은 칸 너비(w-28)를 덮어써서 한 줄 배치가 깨지므로 너비만 빼고 쓴다.
const NARROW_SELECT = SELECT.replace("w-full ", "");
const FLEX_INPUT = INPUT.replace("w-full ", "");

/** 페이지 카드 안의 「📷 무료 사진 검색」(v1.63) — 회원 본인 Pixabay·Pexels 키, 고르면 그 장의 배경이 된다. */
// target "feed"(v1.65): 피드 새 글 「직접 첨부」용 — 서버가 insta-post-images에 JPEG로 저장한다.
export function PhotoSearchPanel({ defaultQuery, ratio, disabled, onPicked, target, buttonLabel = "무료 사진 검색" }: { defaultQuery: string; ratio: RatioId; disabled?: boolean; onPicked: (url: string) => void; target?: "feed"; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<PhotoProvider>("pixabay");
  const [query, setQuery] = useState(defaultQuery.slice(0, 100));
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState<"search" | string | null>(null);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  const call = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/cardnews/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || "사진을 처리하지 못했습니다."), { needKey: !!data.needApiKey });
    return data;
  };

  const search = async () => {
    if (!query.trim() || busy) return;
    setBusy("search");
    setError(null);
    try {
      const data = await call({ action: "search", provider, query, ratio });
      setPhotos(data.photos as Photo[]);
    } catch (e) {
      setError({ message: (e as Error).message, needKey: (e as { needKey?: boolean }).needKey });
    } finally {
      setBusy(null);
    }
  };

  const pick = async (photo: Photo) => {
    if (busy) return;
    setBusy(photo.id);
    setError(null);
    try {
      const data = await call({ action: "pick", url: photo.url, ...(target ? { target } : {}) });
      onPicked(data.url as string);
    } catch (e) {
      setError({ message: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (!open) {
    return (
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={`${BTN_GHOST} w-full px-3 py-1.5 text-xs`}>
        <Camera className="h-3.5 w-3.5" /> {buttonLabel}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-2.5" data-photo-search>
      <div className="flex gap-1.5">
        <select aria-label="사진 제공처" className={`${NARROW_SELECT} w-24 shrink-0 px-2 py-1.5 text-xs`} value={provider} onChange={(e) => setProvider(e.target.value as PhotoProvider)}>
          {PHOTO_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <input aria-label="사진 검색어" className={`${FLEX_INPUT} min-w-0 flex-1 px-2.5 py-1.5 text-xs`} value={query} maxLength={100} placeholder="예: 커피, office, 바다" onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void search()} />
        <button type="button" aria-label="사진 검색" disabled={!query.trim() || !!busy} onClick={() => void search()} className={`${BTN_GHOST} shrink-0 px-2.5 py-1.5 text-xs`}>
          {busy === "search" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">본인 {provider === "pixabay" ? "Pixabay" : "Pexels"} 키로 검색합니다(무료). 영어 검색어가 결과가 더 많습니다.</p>
      {error && <ErrorNote message={error.message} needKey={error.needKey} />}
      {photos && photos.length === 0 && <p className="text-xs text-slate-400">검색 결과가 없습니다. 다른 검색어로 찾아보세요.</p>}
      {photos && photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p) => (
            <button key={p.id} type="button" disabled={!!busy} onClick={() => void pick(p)} title={`${p.author} · ${p.source === "pixabay" ? "Pixabay" : "Pexels"}`} className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-[#262c3d] hover:border-pink-500 disabled:opacity-60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
              <span data-photo-source className="absolute left-1 top-1 rounded bg-black/70 px-1 py-px text-[8px] font-bold text-white">{p.source === "pixabay" ? "Pixabay" : "Pexels"}</span>
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-[9px] text-slate-200">{p.author}</span>
              {busy === p.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-slate-500 hover:text-slate-300">
        접기
      </button>
    </div>
  );
}
