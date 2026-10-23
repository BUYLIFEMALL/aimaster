"use client";

import { useState } from "react";
import { PHOTO_PROVIDERS, type Photo, type PhotoProvider } from "@/threads-content-ops/lib/photoSearch";
import { toEnglishKeywords } from "@/threads-content-ops/lib/photoKeywords";
import type { PostMedia } from "@/threads-content-ops/lib/media";
import { addFreePhoto, searchFreePhotos } from "./web-actions";

/** v2.17: 글 첨부 미디어에 무료 사진(회원 본인 Pixabay·Pexels 키). 고르면 서버가 회원 up 폴더에 저장한 미디어를 넘긴다(30일 정리 대상). */
export function FreePhotoPicker({ defaultQuery, remaining, disabled, productLinked, onPicked }: { defaultQuery: string; remaining: number; disabled?: boolean; productLinked?: boolean; onPicked: (media: PostMedia) => void }) {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<PhotoProvider>("pixabay");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ text: string; needKey?: boolean } | null>(null);
  const [translateNote, setTranslateNote] = useState("");
  // 「🔤 영어로」 바꾸기 전 한국어 검색어 — 영어 결과가 0장이면 「한국어로 다시 찾기」(공용 사전 photo-keywords, AI 없음)
  const [koreanBefore, setKoreanBefore] = useState("");
  const toEnglish = () => {
    const source = (query || defaultQuery).trim();
    const english = toEnglishKeywords(source);
    if (english) {
      setKoreanBefore(/[가-힣]/.test(source) ? source : "");
      setQuery(english);
      setTranslateNote("");
    } else setTranslateNote("사전에 없는 말이에요. 검색어를 직접 영어로 적어 주세요(예: coffee, office).");
  };

  const search = async (override?: string) => {
    const q = (override ?? (query || defaultQuery)).trim().slice(0, 100);
    if (!q || busy) return;
    if (!query) setQuery(q);
    setBusy("search");
    setError(null);
    const result = await searchFreePhotos({ provider, query: q }).catch(() => ({ ok: false as const, error: "사진을 검색하지 못했습니다." }));
    if (result.ok) setPhotos(result.photos);
    else setError({ text: result.error, needKey: "needKey" in result ? result.needKey : false });
    setBusy(null);
  };

  const pick = async (photo: Photo) => {
    if (busy || remaining <= 0) return;
    setBusy(photo.id);
    setError(null);
    const result = await addFreePhoto(photo.url).catch(() => ({ ok: false as const, error: "사진을 추가하지 못했습니다." }));
    if (result.ok) onPicked(result.media);
    else setError({ text: result.error });
    setBusy(null);
  };

  if (!open) {
    return (
      <button type="button" data-free-photo-open disabled={disabled || remaining <= 0} onClick={() => setOpen(true)} className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50">
        📷 무료 사진
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3" data-free-photo>
      {productLinked && <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">상품 글은 상품 사진이 먼저입니다. 무료 사진은 분위기를 더할 때만 써 주세요.</p>}
      <div className="flex gap-2">
        <select aria-label="사진 제공처" value={provider} onChange={(event) => setProvider(event.target.value as PhotoProvider)} className="w-28 shrink-0 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800">
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
          placeholder={defaultQuery ? `비워두면 「${defaultQuery.slice(0, 20)}」로 검색` : "예: coffee, office, 바다"}
          onChange={(event) => { setQuery(event.target.value); setKoreanBefore(""); }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            void search();
          }}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900"
        />
        <button type="button" data-photo-english disabled={!!busy || !(query || defaultQuery).trim()} onClick={toEnglish} className="shrink-0 whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50">
          🔤 영어로
        </button>
        <button type="button" aria-label="사진 검색" disabled={!!busy || !(query || defaultQuery).trim()} onClick={() => void search()} className="shrink-0 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy === "search" ? "검색 중…" : "검색"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">본인 {provider === "pixabay" ? "Pixabay" : "Pexels"} 키로 검색합니다(무료). 영어로 찾으면 결과가 더 많아요. 누르면 이 글의 미디어에 추가됩니다(남은 {remaining}개, 30일 뒤 자동 삭제).</p>
      {translateNote && <p className="text-xs text-amber-700">{translateNote}</p>}
      {error && (
        <p className="text-xs text-rose-700">
          {error.text}
          {error.needKey && (
            <>
              {" "}
              <a href="/threads-content-ops?tab=settings" className="font-semibold underline">설정으로 가기</a>
            </>
          )}
        </p>
      )}
      {photos && photos.length === 0 && <p className="text-xs text-neutral-500">검색 결과가 없습니다. 다른 검색어로 찾아보세요.</p>}
      {photos && photos.length === 0 && koreanBefore && (
        <button
          type="button"
          data-photo-korean-retry
          onClick={() => {
            const k = koreanBefore;
            setKoreanBefore("");
            setQuery(k);
            void search(k);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
        >
          한국어로 다시 찾기 (「{koreanBefore.slice(0, 20)}」)
        </button>
      )}
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
